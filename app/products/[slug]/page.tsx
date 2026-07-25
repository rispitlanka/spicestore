import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductDetailView } from '@/components/organisms/ProductDetailView'

export const revalidate = 60

export interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const supabase = (await createClient()) as any

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (id, name, slug),
      product_images (id, url, sort_order, is_main, cloudinary_public_id, variation_id),
      product_variations (*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !product) {
    notFound()
  }

  // Fetch up to 4 related products from the same category (excluding current product)
  let relatedProducts: any[] = []
  if (product.category_id) {
    const { data: related } = await supabase
      .from('products')
      .select(`
        *,
        categories (id, name, slug),
        product_images (id, url, sort_order, is_main, cloudinary_public_id),
        product_variations (*)
      `)
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .neq('id', product.id)
      .limit(4)

    if (related) {
      relatedProducts = related
    }
  }

  // Fallback to other active products if category has fewer than 4 related items
  if (relatedProducts.length < 4) {
    const existingIds = [product.id, ...relatedProducts.map((p) => p.id)]
    const { data: fallback } = await supabase
      .from('products')
      .select(`
        *,
        categories (id, name, slug),
        product_images (id, url, sort_order, is_main, cloudinary_public_id),
        product_variations (*)
      `)
      .eq('is_active', true)
      .not('id', 'in', `(${existingIds.join(',')})`)
      .limit(4 - relatedProducts.length)

    if (fallback && fallback.length > 0) {
      relatedProducts = [...relatedProducts, ...fallback]
    }
  }

  return (
    <main className="min-h-screen bg-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <ProductDetailView product={product} relatedProducts={relatedProducts} />
    </main>
  )
}

