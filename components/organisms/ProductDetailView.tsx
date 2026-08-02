'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { VariationSelector, ProductVariation } from '@/components/molecules/VariationSelector'
import { QuantitySelector } from '@/components/molecules/QuantitySelector'
import { Button } from '@/components/atoms/Button'
import { useCart } from '@/context/CartContext'
import { PriceTag } from '@/components/atoms/PriceTag'
import { useCurrency } from '@/context/CurrencyContext'
import { useSettings } from '@/context/SettingsContext'
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
  ingredients?: string | null
  shipping_info?: string | null
  storage_tips?: string | null
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
    ingredients?: string | null
    shipping_info?: string | null
    storage_tips?: string | null
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
  const { formatBasePrice } = useCurrency()

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
  const [openIngredients, setOpenIngredients] = useState(false)
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

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [selectedVariation])

  const safeImageIndex = Math.min(
    selectedImageIndex,
    Math.max(0, activeGalleryImages.length - 1)
  )

  const currentMainImage =
    activeGalleryImages[safeImageIndex] ||
    activeGalleryImages[0] ||
    productDefaultImages[0]

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
        
        {/* Left Column: Image Gallery (Vertical column beside main image on desktop, horizontal below on mobile) */}
        <div className="md:col-span-6 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-4 w-full relative">
            {/* Thumbnails Column (Positioned LEFT on desktop md:, below main image on mobile <md) */}
            {activeGalleryImages.length > 1 && (
              <div className="order-2 md:order-1 relative w-full md:w-20 shrink-0">
                <div className="flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto md:absolute md:inset-0 scrollbar-none py-0.5 px-0.5">
                  {activeGalleryImages.map((img, idx) => {
                    const isSelected = idx === safeImageIndex
                    return (
                      <button
                        key={img.id || idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        onMouseEnter={() => setSelectedImageIndex(idx)}
                        aria-label={`View thumbnail ${idx + 1}`}
                        className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-sm border overflow-hidden shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2F6B3C] ring-1 ring-[#2F6B3C]/30 opacity-100'
                            : 'border-[#E7ECE8] hover:border-[#6B7570] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <CldProductImage
                          src={img.url}
                          cloudinaryPublicId={img.cloudinary_public_id}
                          alt={`Thumbnail ${idx + 1}`}
                          width={120}
                          height={120}
                          className="w-full h-full object-cover object-center"
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Main Product Image Container */}
            <div className="order-1 md:order-2 relative aspect-square flex-1 w-full rounded-sm border border-[#E7ECE8] bg-white overflow-hidden flex items-center justify-center">
              {activeGalleryImages.length > 0 ? (
                activeGalleryImages.map((img, idx) => {
                  const isSelected = idx === safeImageIndex
                  return (
                    <CldProductImage
                      key={img.id || img.url || idx}
                      src={img.url}
                      cloudinaryPublicId={img.cloudinary_public_id}
                      alt={`${product.name} view ${idx + 1}`}
                      width={800}
                      height={800}
                      priority={idx === 0}
                      className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ease-in-out ${
                        isSelected ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    />
                  )
                })
              ) : (
                <div className="text-xs text-[#6B7570]">No image available</div>
              )}
            </div>
          </div>
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
                : `Add to cart — ${formatBasePrice(currentPrice * quantity)}`}
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

            {/* Ingredients Toggle */}
            {product.ingredients?.trim() && (
              <div className="border-b border-[#E7ECE8] pb-3">
                <button
                  type="button"
                  onClick={() => setOpenIngredients(!openIngredients)}
                  className="flex items-center justify-between w-full py-1 text-left font-medium text-[#1C2521] hover:text-[#2F6B3C] transition-colors"
                >
                  <span>{openIngredients ? '− Ingredients' : '+ Ingredients'}</span>
                </button>
                {openIngredients && (
                  <div className="mt-2 text-xs sm:text-sm text-[#6B7570] leading-relaxed whitespace-pre-line">
                    {product.ingredients}
                  </div>
                )}
              </div>
            )}

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
                <div className="mt-2 text-xs sm:text-sm text-[#6B7570] leading-relaxed whitespace-pre-line">
                  {product.shipping_info?.trim() ||
                    settings.default_shipping_note ||
                    'Standard delivery packed in sealed food-safe pouches.\nShipping costs automatically calculated at checkout based on package weight.'}
                </div>
              )}
            </div>

            {/* Storage Tips Toggle (only render if storage_tips is set for this product) */}
            {product.storage_tips?.trim() && (
              <div className="border-b border-[#E7ECE8] pb-3">
                <button
                  type="button"
                  onClick={() => setOpenStorage(!openStorage)}
                  className="flex items-center justify-between w-full py-1 text-left font-medium text-[#1C2521] hover:text-[#2F6B3C] transition-colors"
                >
                  <span>{openStorage ? '− Storage Tips' : '+ Storage Tips'}</span>
                </button>
                {openStorage && (
                  <div className="mt-2 text-xs sm:text-sm text-[#6B7570] leading-relaxed whitespace-pre-line">
                    {product.storage_tips}
                  </div>
                )}
              </div>
            )}
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
