'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'

export interface ProductWithDetails extends Tables<'products'> {
  categories?: { id: string; name: string; slug: string } | null
  product_images?: Tables<'product_images'>[]
  product_variations?: Tables<'product_variations'>[]
}

export interface UseCapacityUpsellOptions {
  countryId?: string | null
  coveredCapacityGrams: number
  cartWeightGrams: number
}

export interface UseCapacityUpsellResult {
  leftoverGrams: number
  isEligible: boolean
  products: ProductWithDetails[]
  loading: boolean
  formatWeightGrams: (grams: number) => string
}

export function formatWeightGrams(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2)}kg`
  }
  return `${grams}g`
}

export function useCapacityUpsell({
  countryId,
  coveredCapacityGrams,
  cartWeightGrams,
}: UseCapacityUpsellOptions): UseCapacityUpsellResult {
  const leftoverGrams = Math.max(0, coveredCapacityGrams - cartWeightGrams)
  const isEligible = Boolean(countryId) && coveredCapacityGrams > 0 && leftoverGrams >= 100

  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  // Fetch active products when user is eligible
  useEffect(() => {
    if (!isEligible) {
      return
    }

    let active = true

    const fetchActiveProducts = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            categories (id, name, slug),
            product_images (id, url, sort_order),
            product_variations (*)
          `)
          .eq('is_active', true)

        if (!active) return

        if (error || !data) {
          console.error('Error fetching upsell recommendations:', error)
          setAllProducts([])
        } else {
          setAllProducts(data as ProductWithDetails[])
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load upsell recommendations:', err)
          setAllProducts([])
        }
      } finally {
        if (active) {
          setLoading(false)
          setHasFetched(true)
        }
      }
    }

    // Only fetch if not already fetched, or if eligible
    if (!hasFetched) {
      fetchActiveProducts()
    }

    return () => {
      active = false
    }
  }, [isEligible, hasFetched])

  // Filter products live based on leftoverGrams
  const products = useMemo(() => {
    if (!isEligible || leftoverGrams < 100) return []

    return allProducts
      .map((product) => {
        const firstVar = product.product_variations?.[0]
        const weightKg = product.base_weight_kg ?? firstVar?.weight_kg ?? 0
        const weightGrams = Math.round(weightKg * 1000)
        return { product, weightGrams }
      })
      .filter((item) => item.weightGrams > 0 && item.weightGrams <= leftoverGrams)
      .sort((a, b) => b.weightGrams - a.weightGrams)
      .map((item) => item.product)
      .slice(0, 4) // Query/limit 3-4 products fitting leftover weight
  }, [allProducts, isEligible, leftoverGrams])

  return {
    leftoverGrams,
    isEligible: isEligible && (loading || products.length > 0),
    products,
    loading,
    formatWeightGrams,
  }
}
