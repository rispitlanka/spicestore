import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/molecules/ProductCard'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Button } from '@/components/atoms/Button'

export const revalidate = 60

interface ProductItem {
  id: string
  name: string
  slug: string
  description: string | null
  base_price: number | null
  compare_at_price?: number | null
  base_weight_kg: number | null
  has_variations: boolean
  is_active: boolean
  created_at: string
  categories: { id: string; name: string; slug: string } | null
  product_images: { id: string; url: string; sort_order: number; is_main?: boolean; cloudinary_public_id?: string | null; variation_id?: string | null }[]
  product_variations: {
    id: string
    price: number
    compare_at_price?: number | null
    stock: number
    is_active: boolean
  }[]
}

interface PageProps {
  searchParams: Promise<{ search?: string; category?: string; sort?: string }>
}

function processProduct(product: ProductItem) {
  const images = product.product_images || []
  const activeVariations = (product.product_variations || []).filter((v) => v.is_active)

  let cardImageObj: (typeof images)[0] | null = null

  if (product.has_variations && activeVariations.length > 0) {
    const firstVarId = activeVariations[0].id
    cardImageObj =
      images.find((i) => i.variation_id === firstVarId && i.is_main) ||
      images.find((i) => i.variation_id === firstVarId) ||
      images.find((i) => !i.variation_id && i.is_main) ||
      images.find((i) => !i.variation_id) ||
      images[0] ||
      null
  } else {
    cardImageObj =
      images.find((i) => !i.variation_id && i.is_main) ||
      images.find((i) => i.is_main) ||
      images[0] ||
      null
  }

  const firstImage = cardImageObj ? cardImageObj.url : null
  const cloudinaryPublicId = cardImageObj ? cardImageObj.cloudinary_public_id : null


  let minPrice: number | undefined
  let maxPrice: number | undefined
  let compareAtPrice: number | undefined

  if (product.has_variations && activeVariations.length > 0) {
    const prices = activeVariations.map((v) => Number(v.price))
    minPrice = Math.min(...prices)
    maxPrice = Math.max(...prices)
    const variationComparePrices = activeVariations
      .map((v) => (v.compare_at_price ? Number(v.compare_at_price) : 0))
      .filter((p) => p > 0)
    if (variationComparePrices.length > 0) {
      compareAtPrice = Math.max(...variationComparePrices)
    }
  } else {
    if (product.compare_at_price) {
      compareAtPrice = Number(product.compare_at_price)
    }
  }

  const effectivePrice = product.base_price ?? minPrice ?? 0

  const isOutOfStock =
    !product.is_active ||
    (product.has_variations && activeVariations.length > 0
      ? activeVariations.every((v) => Number(v.stock || 0) <= 0)
      : false)

  return {
    ...product,
    firstImage,
    cloudinaryPublicId,
    effectivePrice,
    minPrice,
    maxPrice,
    compareAtPrice,
    isOutOfStock,
  }
}

export default async function HomePage({ searchParams }: PageProps) {
  const { search, category, sort } = await searchParams
  const supabase = (await createClient()) as any

  // Fetch active categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const categories = (categoriesData || []) as { id: string; name: string; slug: string }[]

  // Fetch active products
  let query = supabase
    .from('products')
    .select(`
      *,
      categories (id, name, slug),
      product_images (id, url, sort_order, is_main, cloudinary_public_id, variation_id),
      product_variations (*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (category) {
    const matchCat = categories.find((c) => c.slug === category)
    if (matchCat) {
      query = query.eq('category_id', matchCat.id)
    }
  }

  const { data: productsData, error } = await query

  if (error) {
    console.error('Error fetching products for homepage:', error)
  }

  let products = ((productsData || []) as ProductItem[]).map(processProduct)

  if (search && search.trim()) {
    const s = search.trim().toLowerCase()
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.description && p.description.toLowerCase().includes(s)) ||
        (p.categories && p.categories.name.toLowerCase().includes(s))
    )
  }

  // Merchandising toggle: optional sort/filter
  if (sort === 'just-in') {
    products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const currentCategoryObj = category ? categories.find((c) => c.slug === category) : null
  const gridHeading = currentCategoryObj ? currentCategoryObj.name : 'Available Now'

  return (
    <main className="w-full min-h-screen bg-white text-[#1C2521] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        
        {/* 1. Header text: single line */}
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Jaffna spices and snacks, sourced and packed with care.
          </h1>
        </div>

        {/* Quiet photo strip: max 300px tall, purely visual, no text on top */}
        <div className="w-full h-44 sm:h-56 overflow-hidden rounded-md bg-[#F4F6F4]">
          <img
            src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80"
            alt="Jaffna spices and snacks visual strip"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 2. Category links: simple horizontal row of plain text links */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto border-b border-[#E7ECE8] pb-1 text-sm no-scrollbar">
          <Link
            href={sort ? `/?sort=${sort}` : '/'}
            className={
              !category
                ? 'text-[#2F6B3C] font-semibold border-b-2 border-[#2F6B3C] pb-2 -mb-1 whitespace-nowrap min-h-[44px] inline-flex items-center'
                : 'text-[#6B7570] hover:text-[#1C2521] font-normal transition-colors pb-2 whitespace-nowrap min-h-[44px] inline-flex items-center'
            }
          >
            All Products
          </Link>

          {categories.map((cat) => {
            const isSelected = category === cat.slug
            const href = sort ? `/?category=${cat.slug}&sort=${sort}` : `/?category=${cat.slug}`
            return (
              <Link
                key={cat.id}
                href={href}
                className={
                  isSelected
                    ? 'text-[#2F6B3C] font-semibold border-b-2 border-[#2F6B3C] pb-2 -mb-1 whitespace-nowrap min-h-[44px] inline-flex items-center'
                    : 'text-[#6B7570] hover:text-[#1C2521] font-normal transition-colors pb-2 whitespace-nowrap min-h-[44px] inline-flex items-center'
                }
              >
                {cat.name}
              </Link>
            )
          })}
        </div>

        {/* 3. Single Product Grid section header */}
        <div className="flex flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-baseline gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-medium text-[#1C2521]">
              {gridHeading}
            </h2>
            <span className="text-xs text-[#6B7570]">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Light merchandising touch: single "Just In" toggle */}
          <div className="flex items-center gap-2 text-xs text-[#6B7570]">
            <Link
              href={
                category
                  ? sort === 'just-in'
                    ? `/?category=${category}`
                    : `/?category=${category}&sort=just-in`
                  : sort === 'just-in'
                  ? '/'
                  : '/?sort=just-in'
              }
              className={`px-3 py-1.5 min-h-[44px] inline-flex items-center rounded border transition-colors ${
                sort === 'just-in'
                  ? 'border-[#2F6B3C] bg-[#2F6B3C]/10 text-[#2F6B3C] font-medium'
                  : 'border-[#E7ECE8] hover:border-[#6B7570] text-[#1C2521]'
              }`}
            >
              Just In
            </Link>
          </div>
        </div>

        {/* One product grid (2-column on mobile) */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="block h-full">
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.effectivePrice}
                  originalPrice={product.compareAtPrice}
                  minPrice={product.minPrice}
                  maxPrice={product.maxPrice}
                  hasVariations={product.has_variations}
                  weightKg={product.base_weight_kg}
                  imageUrl={product.firstImage}
                  categoryName={product.categories?.name}
                  slug={product.slug}
                  outOfStock={product.isOutOfStock}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={search ? `No products matching "${search}"` : 'No products found'}
            description="Try adjusting your search query or selecting another category."
            action={
              <Link href="/">
                <Button variant="secondary" size="md">
                  View all products
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </main>
  )
}

