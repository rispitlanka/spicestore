'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { VariationSelector, ProductVariation } from '@/components/molecules/VariationSelector'
import { QuantitySelector } from '@/components/molecules/QuantitySelector'
import { Button } from '@/components/atoms/Button'
import { useCart } from '@/context/CartContext'
import { PriceTag } from '@/components/atoms/PriceTag'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { CldProductImage } from '@/components/atoms/CldProductImage'

export interface ProductImageItem {
  id: string
  url: string
  sort_order?: number | null
  variation_id?: string | null
  is_main?: boolean | null
  cloudinary_public_id?: string | null
}

export interface RawVariationItem {
  id: string
  product_id: string
  attributes: Record<string, string> | unknown
  sku?: string | null
  price: number
  weight_kg: number
  stock: number
  is_active: boolean
  compare_at_price?: number | null
}

export interface RelatedProductItem {
  id: string
  name: string
  slug: string
  description?: string | null
  base_price?: number | null
  base_weight_kg?: number | null
  has_variations: boolean
  is_active: boolean
  categories?: { id: string; name: string; slug: string } | null
  product_images?: ProductImageItem[]
  product_variations?: RawVariationItem[]
}

export interface ProductDetailViewProps {
  product: {
    id: string
    name: string
    slug: string
    description?: string | null
    spice_level?: number | null
    has_variations: boolean
    base_price?: number | null
    compare_at_price?: number | null
    base_weight_kg?: number | null
    is_active: boolean
    categories?: { id: string; name: string; slug: string } | null
    product_images?: ProductImageItem[]
    product_variations?: RawVariationItem[]
  }
  relatedProducts?: RelatedProductItem[]
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  relatedProducts = [],
}) => {
  const { addItem } = useCart()
  const { settings } = useSettings()

  const allImages = useMemo(() => product.product_images || [], [product.product_images])

  const productDefaultImages = useMemo(() => {
    const defaults = allImages.filter((img) => !img.variation_id)
    return [...defaults].sort((a, b) => {
      if (a.is_main && !b.is_main) return -1
      if (!a.is_main && b.is_main) return 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  }, [allImages])

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const rawVariations = useMemo(
    () => (product.product_variations || []).filter((v) => v.is_active),
    [product.product_variations]
  )

  const variations: ProductVariation[] = useMemo(() => {
    return rawVariations.map((v) => {
      const attrs = (v.attributes && typeof v.attributes === 'object'
        ? v.attributes
        : {}) as Record<string, string>

      const varImg =
        allImages.find((img) => img.variation_id === v.id && img.is_main) ||
        allImages.find((img) => img.variation_id === v.id) ||
        productDefaultImages.find((img) => img.is_main) ||
        productDefaultImages[0]

      return {
        id: v.id,
        price: Number(v.price),
        originalPrice: v.compare_at_price ? Number(v.compare_at_price) : undefined,
        weightKg: Number(v.weight_kg),
        attributes: attrs,
        stock: v.stock,
        outOfStock: v.stock <= 0 || !v.is_active,
        imageUrl: varImg ? varImg.url : null,
      }
    })
  }, [rawVariations, allImages, productDefaultImages])

  const initialVariation = useMemo(() => {
    if (!product.has_variations || variations.length === 0) return null
    return variations.find((v) => !v.outOfStock) || variations[0]
  }, [product.has_variations, variations])

  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(initialVariation)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  // Expandable sections toggles
  const [openDescription, setOpenDescription] = useState(false)
  const [openShipping, setOpenShipping] = useState(false)
  const [openStorage, setOpenStorage] = useState(false)

  const activeGalleryImages = useMemo(() => {
    if (selectedVariation) {
      const varImages = allImages.filter((img) => img.variation_id === selectedVariation.id)
      if (varImages.length > 0) {
        return [...varImages].sort((a, b) => {
          if (a.is_main && !b.is_main) return -1
          if (!a.is_main && b.is_main) return 1
          return (a.sort_order ?? 0) - (b.sort_order ?? 0)
        })
      }
    }
    if (productDefaultImages.length > 0) {
      return productDefaultImages
    }
    return [...allImages].sort((a, b) => {
      if (a.is_main && !b.is_main) return -1
      if (!a.is_main && b.is_main) return 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  }, [selectedVariation, allImages, productDefaultImages])

  const currentMainImage = activeGalleryImages[selectedImageIndex] || activeGalleryImages[0] || productDefaultImages[0]

  const currentPrice = product.has_variations && selectedVariation
    ? selectedVariation.price
    : Number(product.base_price ?? 0)

  const compareAtPrice = product.has_variations && selectedVariation
    ? selectedVariation.originalPrice
    : product.compare_at_price ? Number(product.compare_at_price) : undefined

  const hasComparePrice = compareAtPrice !== undefined && compareAtPrice > currentPrice

  const currentWeightKg = product.has_variations && selectedVariation
    ? selectedVariation.weightKg
    : (product.base_weight_kg ? Number(product.base_weight_kg) : null)

  const currentStock = product.has_variations && selectedVariation
    ? (selectedVariation.stock ?? 0)
    : (product.is_active ? 99 : 0)

  const isOutOfStock = !product.is_active || (product.has_variations && (!selectedVariation || selectedVariation.outOfStock || currentStock <= 0))
  const maxSelectableQuantity = Math.max(1, Math.min(99, currentStock))

  const handleAddToCart = () => {
    if (isOutOfStock || isAdding) return
    setIsAdding(true)

    const mainImageUrl = currentMainImage?.url || null

    addItem({
      productId: product.id,
      variationId: selectedVariation?.id || null,
      name: product.name,
      slug: product.slug,
      price: currentPrice,
      weightKg: currentWeightKg ?? 0,
      imageUrl: mainImageUrl,
      variationAttributes: selectedVariation?.attributes || null,
      quantity,
    })

    setIsAdding(false)
    setAddedSuccess(true)
    setTimeout(() => setAddedSuccess(false), 2500)
  }

  const formatWeight = (kg: number) => {
    if (kg < 1) {
      return `${Math.round(kg * 1000)}g`
    }
    return `${kg} kg`
  }

  return (
    <div className="flex flex-col gap-10 font-sans bg-white text-[#1C2521] pb-20 md:pb-0">
      {/* 2-Column Product Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Image & Small Plain Thumbnails */}
        <div className="md:col-span-6 flex flex-col gap-3">
          {/* Main Product Image */}
          <div className="relative aspect-square w-full rounded-sm border border-[#E7ECE8] bg-white overflow-hidden flex items-center justify-center">
            {currentMainImage ? (
              <CldProductImage
                src={currentMainImage.url}
                cloudinaryPublicId={currentMainImage.cloudinary_public_id}
                alt={product.name}
                width={800}
                height={800}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="text-xs text-[#6B7570]">No image available</div>
            )}
          </div>

          {/* Thumbnails below (small and plain) */}
          {activeGalleryImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {activeGalleryImages.map((img, idx) => {
                const isSelected = idx === selectedImageIndex
                return (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-sm border overflow-hidden shrink-0 transition-colors ${
                      isSelected ? 'border-[#2F6B3C]' : 'border-[#E7ECE8] hover:border-[#6B7570]'
                    }`}
                  >
                    <CldProductImage
                      src={img.url}
                      cloudinaryPublicId={img.cloudinary_public_id}
                      alt={`Thumbnail ${idx}`}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Undecorated Details */}
        <div className="md:col-span-6 flex flex-col gap-5">
          
          {/* Plain Text Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-[#6B7570]">
            <ol className="flex items-center gap-1.5 flex-wrap font-normal">
              <li>
                <Link href="/" className="hover:text-[#1C2521] transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              {product.categories && (
                <>
                  <li>
                    <Link
                      href={`/?category=${product.categories.slug}`}
                      className="hover:text-[#1C2521] transition-colors"
                    >
                      {product.categories.name}
                    </Link>
                  </li>
                  <li>/</li>
                </>
              )}
              <li className="text-[#1C2521] font-normal truncate max-w-[200px]">
                {product.name}
              </li>
            </ol>
          </nav>

          {/* Product Name (Heading weight, no color) */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight">
            {product.name}
          </h1>

          {/* Price (Green) & Weight/Pack Size */}
          <div className="flex items-baseline gap-2">
            <PriceTag
              amount={currentPrice}
              originalAmount={hasComparePrice ? compareAtPrice : undefined}
              size="lg"
            />
            {currentWeightKg !== null && currentWeightKg !== undefined && (
              <span className="text-xs text-[#6B7570] font-normal ml-1">
                ({formatWeight(currentWeightKg)})
              </span>
            )}
          </div>

          {/* VariationSelector (Plain rectangular chips) */}
          {product.has_variations && variations.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#1C2521]">Option</span>
              <VariationSelector
                variations={variations}
                selectedVariationId={selectedVariation?.id}
                onVariationChange={(v) => {
                  setSelectedVariation(v)
                  setSelectedImageIndex(0)
                  setQuantity(1)
                }}
                showDetailsSummary={false}
              />
            </div>
          )}

          {/* Short Description (Plain paragraph text) */}
          {product.description && (
            <p className="text-sm text-[#6B7570] leading-relaxed font-normal">
              {product.description}
            </p>
          )}

          {/* Quantity Selector + Primary Add to Cart Button */}
          <div className="flex items-center gap-3 pt-2">
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={maxSelectableQuantity}
              disabled={isOutOfStock || isAdding}
            />

            <Button
              variant="primary"
              size="lg"
              disabled={isOutOfStock || isAdding}
              onClick={handleAddToCart}
              className="flex-1"
            >
              {isAdding
                ? 'Adding...'
                : addedSuccess
                ? '✓ Added to Cart'
                : isOutOfStock
                ? 'Out of Stock'
                : `Add to cart — ${formatPriceWithSymbol(currentPrice * quantity, settings.store_currency.symbol)}`}
            </Button>
          </div>

          {/* Plain-text Expandable Sections with thin dividers */}
          <div className="border-t border-[#E7ECE8] pt-4 mt-2 space-y-3 text-sm">
            {/* Full Description Toggle */}
            <div className="border-b border-[#E7ECE8] pb-3">
              <button
                type="button"
                onClick={() => setOpenDescription(!openDescription)}
                className="flex items-center justify-between w-full py-1 text-left font-medium text-[#1C2521] hover:text-[#2F6B3C] transition-colors"
              >
                <span>{openDescription ? '− Full Description' : '+ Full Description'}</span>
              </button>
              {openDescription && (
                <div className="mt-2 text-xs sm:text-sm text-[#6B7570] leading-relaxed">
                  {product.description || 'Authentic Jaffna product sourced directly from local producers and packed under high quality standards.'}
                </div>
              )}
            </div>

            {/* Shipping Info Toggle */}
            <div className="border-b border-[#E7ECE8] pb-3">
              <button
                type="button"
                onClick={() => setOpenShipping(!openShipping)}
                className="flex items-center justify-between w-full py-1 text-left font-medium text-[#1C2521] hover:text-[#2F6B3C] transition-colors"
              >
                <span>{openShipping ? '− Shipping Info' : '+ Shipping Info'}</span>
              </button>
              {openShipping && (
                <div className="mt-2 text-xs sm:text-sm text-[#6B7570] leading-relaxed space-y-1">
                  <p>Standard delivery packed in sealed food-safe pouches.</p>
                  <p>Shipping costs automatically calculated at checkout based on package weight.</p>
                </div>
              )}
            </div>

            {/* Storage Tips Toggle */}
            <div className="border-b border-[#E7ECE8] pb-3">
              <button
                type="button"
                onClick={() => setOpenStorage(!openStorage)}
                className="flex items-center justify-between w-full py-1 text-left font-medium text-[#1C2521] hover:text-[#2F6B3C] transition-colors"
              >
                <span>{openStorage ? '− Storage Tips' : '+ Storage Tips'}</span>
              </button>
              {openStorage && (
                <div className="mt-2 text-xs sm:text-sm text-[#6B7570] leading-relaxed">
                  Store in an airtight container in a cool, dry place. Protect from heat and moisture to retain freshness and aroma.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Simple Text-Link Row for Related Products ("More from Category") */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="pt-6 border-t border-[#E7ECE8] flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#6B7570]">
          <span className="font-medium text-[#1C2521]">
            More from {product.categories?.name || 'Spices'}:
          </span>
          {relatedProducts.map((relProduct, idx) => (
            <React.Fragment key={relProduct.id}>
              {idx > 0 && <span className="text-[#6B7570]/40">•</span>}
              <Link
                href={`/products/${relProduct.slug}`}
                className="text-[#2F6B3C] hover:underline font-normal transition-colors py-1 inline-block"
              >
                {relProduct.name}
              </Link>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Sticky Bottom Add to Cart Bar on Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E7ECE8] px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 font-sans">
        <div className="flex flex-col">
          <span className="text-[11px] text-[#6B7570]">Total</span>
          <PriceTag amount={currentPrice * quantity} size="md" />
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={isOutOfStock || isAdding}
          onClick={handleAddToCart}
          className="min-h-[44px] flex-1 max-w-[220px]"
        >
          {isAdding
            ? 'Adding...'
            : addedSuccess
            ? '✓ Added'
            : isOutOfStock
            ? 'Out of Stock'
            : 'Add to Cart'}
        </Button>
      </div>
    </div>
  )
}
