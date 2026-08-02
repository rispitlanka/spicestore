'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { WeightTag } from '../atoms/WeightTag'
import { PriceTag } from '../atoms/PriceTag'
import { useCart } from '@/context/CartContext'

import { CldProductImage } from '../atoms/CldProductImage'

export interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  name: string
  price: number
  originalPrice?: number
  minPrice?: number
  maxPrice?: number
  hasVariations?: boolean
  weightKg?: number | string | null
  imageUrl?: string | null
  cloudinaryPublicId?: string | null
  secondaryImageUrl?: string | null
  secondaryCloudinaryPublicId?: string | null
  categoryName?: string
  slug?: string
  outOfStock?: boolean
  isAddingToCart?: boolean
  onAddToCart?: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void
  onCardClick?: (id: string) => void
  currency?: string
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  minPrice,
  maxPrice,
  hasVariations = false,
  weightKg,
  imageUrl,
  cloudinaryPublicId,
  secondaryImageUrl,
  secondaryCloudinaryPublicId,
  categoryName,
  slug,
  outOfStock = false,
  isAddingToCart = false,
  onAddToCart,
  onCardClick,
  currency,
  className,
  ...props
}) => {
  const { addItem } = useCart()

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(id)
    }
  }

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (outOfStock || isAddingToCart) return
    if (onAddToCart) {
      onAddToCart(id, e)
    } else {
      const numWeight = typeof weightKg === 'string' ? parseFloat(weightKg) : (weightKg ?? 0)
      addItem({
        productId: id,
        name,
        slug: slug || id,
        price,
        weightKg: isNaN(numWeight) ? 0 : numWeight,
        imageUrl,
        quantity: 1,
      })
    }
  }

  const isRange =
    hasVariations ||
    (minPrice !== undefined && maxPrice !== undefined && minPrice < maxPrice)

  const hasSecondaryImage = Boolean(secondaryImageUrl || secondaryCloudinaryPublicId)

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative flex flex-col rounded-[4px] border border-[#E7ECE8] bg-white overflow-hidden hover:border-[#2F6B3C] transition-colors cursor-pointer h-full font-sans',
        outOfStock && 'opacity-70',
        className
      )}
      {...props}
    >
      {/* Product Image */}
      <div className="relative aspect-square w-full bg-white overflow-hidden border-b border-[#E7ECE8]">
        {/* Main image */}
        <CldProductImage
          src={imageUrl}
          cloudinaryPublicId={cloudinaryPublicId}
          alt={name}
          width={500}
          height={500}
          className={cn(
            'absolute inset-0 h-full w-full object-cover object-center group-hover:scale-102 transition-all duration-300 ease-in-out opacity-100',
            hasSecondaryImage && 'product-card-main-image-has-hover'
          )}
        />

        {/* Hover image (preloaded eagerly, stacked directly on top of main image) */}
        {hasSecondaryImage && (
          <CldProductImage
            src={secondaryImageUrl}
            cloudinaryPublicId={secondaryCloudinaryPublicId}
            alt={`${name} hover preview`}
            width={500}
            height={500}
            priority={true}
            className="absolute inset-0 h-full w-full object-cover object-center group-hover:scale-102 opacity-0 transition-all duration-300 ease-in-out pointer-events-none product-card-hover-image"
          />
        )}

        {/* Out of Stock notice (Plain text, no fill background pill) */}
        {outOfStock && (
          <span className="absolute top-2 left-2 z-10 text-[11px] font-medium text-[#6B7570]">
            Out of stock
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4 bg-white space-y-2 sm:space-y-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="text-xs sm:text-sm font-semibold text-[#1C2521] leading-snug group-hover:text-[#2F6B3C] transition-colors line-clamp-2">
              {name}
            </h3>
            {weightKg !== undefined && weightKg !== null && (
              <WeightTag weightKg={weightKg} size="sm" className="shrink-0 mt-0.5" />
            )}
          </div>
          {categoryName && (
            <p className="text-[11px] sm:text-xs text-[#6B7570] font-normal">{categoryName}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#E7ECE8] gap-1">
          <div className="flex items-baseline gap-1">
            {isRange ? (
              <span className="text-xs sm:text-sm font-medium text-[#2F6B3C] inline-flex items-baseline gap-1">
                <span>From</span>
                <PriceTag amount={minPrice !== undefined ? minPrice : price} size="sm" />
              </span>
            ) : (
              <PriceTag amount={price} originalAmount={originalPrice} currency={currency} size="sm" />
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock || isAddingToCart}
            aria-label={hasVariations ? `Select options for ${name}` : `Add ${name} to cart`}
            className={cn(
              "min-h-[44px] px-1 text-xs font-medium text-[#2F6B3C] hover:underline cursor-pointer shrink-0 bg-transparent inline-flex items-center justify-center border-0 touch-manipulation",
              outOfStock && "text-[#6B7570] hover:no-underline cursor-not-allowed"
            )}
          >
            {outOfStock ? 'Unavailable' : hasVariations ? 'Options' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
