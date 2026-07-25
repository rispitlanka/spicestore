import React from 'react'
import Link from 'next/link'
import { searchProducts } from '@/lib/search/searchProducts'
import { ProductCard } from '@/components/molecules/ProductCard'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Button } from '@/components/atoms/Button'

export const revalidate = 0

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = (q || '').trim()

  const { products, matchedCategory, totalMatches } = await searchProducts(query)

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Search Header */}
      <div className="border-b border-[#E7ECE8] pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#6B7570]">
          <Link href="/" className="hover:text-[#2F6B3C] transition-colors">
            Storefront
          </Link>
          <span>/</span>
          <span className="text-[#1C2521] font-medium">Search</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight">
              {query ? `Results for "${query}"` : 'Search Products'}
            </h1>
            {query && (
              <p className="mt-1 text-sm text-[#6B7570] font-normal">
                Found {totalMatches} {totalMatches === 1 ? 'item' : 'items'} matching your query
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Suggestion Banner if Query Matches Category */}
      {matchedCategory && (
        <div className="p-4 bg-[#F4F6F4] border border-[#E7ECE8] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-[#6B7570]">Matching Category:</span>{' '}
            <strong className="text-[#1C2521] font-semibold">{matchedCategory.name}</strong>
          </div>
          <Link
            href={`/category/${matchedCategory.slug}`}
            className="text-[#2F6B3C] font-semibold hover:underline text-xs sm:text-sm inline-flex items-center gap-1"
          >
            Explore all items in {matchedCategory.name} &rarr;
          </Link>
        </div>
      )}

      {/* Product Results Grid or Empty State */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="block h-full">
              <ProductCard
                id={product.id}
                name={product.name}
                price={product.effectivePrice}
                minPrice={product.min_price < product.max_price ? product.min_price : undefined}
                maxPrice={product.min_price < product.max_price ? product.max_price : undefined}
                hasVariations={product.has_variations}
                weightKg={product.base_weight_kg}
                imageUrl={product.image_url}
                categoryName={product.category_name || undefined}
                slug={product.slug}
                outOfStock={product.is_out_of_stock}
              />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={query ? `No products found for "${query}"` : 'Enter a query to search'}
          description={
            query
              ? 'We couldn\'t find any active products matching your search query. Try checking for typos or searching another keyword.'
              : 'Type a product name or category in the search bar above.'
          }
          action={
            <Link href="/">
              <Button variant="secondary" size="md">
                Browse all products
              </Button>
            </Link>
          }
        />
      )}
    </main>
  )
}
