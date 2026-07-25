import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/molecules/ProductCard'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Button } from '@/components/atoms/Button'

export const revalidate = 60

export interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const supabase = (await createClient()) as any

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (categoryError || !category) {
    notFound()
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      categories (id, name, slug),
      product_images (id, url, sort_order, is_main, cloudinary_public_id, variation_id),
      product_variations (*)
    `)
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (productsError) {
    console.error('Error fetching products for category:', productsError)
  }

  const categoryProducts = products || []
  const allCategories = categories || []

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Category Header */}
      <div className="border-b border-[#E7ECE8] pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#6B7570]">
          <Link href="/" className="hover:text-[#2F6B3C] transition-colors">
            All Products
          </Link>
          <span>/</span>
          <span className="text-[#1C2521] font-medium">{category.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight">
              {category.name}
            </h1>
            <p className="mt-1 text-sm text-[#6B7570] font-normal">
              Showing {categoryProducts.length} {categoryProducts.length === 1 ? 'item' : 'items'} in {category.name}
            </p>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      {allCategories.length > 0 && (
        <div className="flex items-center gap-6 overflow-x-auto pb-2 border-b border-[#E7ECE8] text-sm">
          <Link
            href="/"
            className="text-[#1C2521] hover:text-[#2F6B3C] font-normal transition-colors pb-2"
          >
            All Products
          </Link>
          {(allCategories as any[]).map((cat: any) => {
            const isCurrent = cat.slug === category.slug
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className={
                  isCurrent
                    ? 'text-[#2F6B3C] font-medium border-b-2 border-[#2F6B3C] pb-2 -mb-2'
                    : 'text-[#1C2521] hover:text-[#2F6B3C] font-normal transition-colors pb-2'
                }
              >
                {cat.name}
              </Link>
            )
          })}
        </div>
      )}

      {/* Product Grid or Empty State */}
      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {(categoryProducts as any[]).map((product: any) => {
            const images = (product.product_images || []) as any[]
            const variations = ((product.product_variations || []) as any[]).filter((v) => v.is_active)

            let mainImg: any = null
            if (product.has_variations && variations.length > 0) {
              const firstVarId = variations[0].id
              mainImg =
                images.find((i) => i.variation_id === firstVarId && i.is_main) ||
                images.find((i) => i.variation_id === firstVarId) ||
                images.find((i) => !i.variation_id && i.is_main) ||
                images.find((i) => !i.variation_id) ||
                images[0] ||
                null
            } else {
              mainImg =
                images.find((i) => !i.variation_id && i.is_main) ||
                images.find((i) => i.is_main) ||
                images[0] ||
                null
            }

            const firstImage = mainImg ? mainImg.url : null
            const cldPublicId = mainImg ? mainImg.cloudinary_public_id : null

            let minPrice: number | undefined
            let maxPrice: number | undefined

            if (product.has_variations && variations.length > 0) {
              const prices = variations.map((v: { price: number }) => Number(v.price))
              minPrice = Math.min(...prices)
              maxPrice = Math.max(...prices)
            }

            const isOutOfStock = !product.is_active || (
              product.has_variations && variations.every((v: { stock: number }) => v.stock <= 0)
            )

            return (
              <Link key={product.id} href={`/products/${product.slug}`} className="block">
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.base_price ?? minPrice ?? 0}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  hasVariations={product.has_variations}
                  weightKg={product.base_weight_kg}
                  imageUrl={firstImage}
                  cloudinaryPublicId={cldPublicId}
                  categoryName={product.categories?.name}
                  slug={product.slug}
                  outOfStock={isOutOfStock}
                />
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={`No products in ${category.name}`}
          description="There are currently no active products in this category."
          action={
            <Link href="/">
              <Button variant="secondary" size="md">
                Browse All Products
              </Button>
            </Link>
          }
        />
      )}
    </main>
  )
}
