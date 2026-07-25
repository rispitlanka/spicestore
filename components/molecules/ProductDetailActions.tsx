'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Select } from '../atoms/Select'
import { QuantitySelector } from './QuantitySelector'
import { Button } from '../atoms/Button'
import { PriceTag } from '../atoms/PriceTag'
import { WeightTag } from '../atoms/WeightTag'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { Tables } from '@/types/database'
import { useCart } from '@/context/CartContext'

export interface ProductDetailActionsProps {
  productId: string
  productName?: string
  productSlug?: string
  imageUrl?: string | null
  hasVariations?: boolean
  variations?: Tables<'product_variations'>[]
  basePrice?: number | null
  baseWeightKg?: number | null
  outOfStock?: boolean
  currency?: string
  onAddToCart?: (productId: string, variationId: string | null, quantity: number) => void
  className?: string
}

export const ProductDetailActions: React.FC<ProductDetailActionsProps> = ({
  productId,
  productName,
  productSlug,
  imageUrl,
  hasVariations = false,
  variations = [],
  basePrice = 0,
  baseWeightKg = null,
  outOfStock = false,
  currency = 'USD',
  onAddToCart,
  className,
}) => {
  const { addItem } = useCart()
  const { settings } = useSettings()
  const activeVariations = variations.filter((v) => v.is_active)
  const [selectedVariationId, setSelectedVariationId] = useState<string>(
    activeVariations.length > 0 ? activeVariations[0].id : ''
  )
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  const selectedVariation = activeVariations.find((v) => v.id === selectedVariationId)

  const currentPrice = hasVariations && selectedVariation ? selectedVariation.price : (basePrice ?? 0)
  const currentWeight = hasVariations && selectedVariation ? selectedVariation.weight_kg : baseWeightKg
  const currentStock = hasVariations && selectedVariation ? selectedVariation.stock : 99
  const isVariationOutOfStock = hasVariations && selectedVariation ? selectedVariation.stock <= 0 : outOfStock

  const handleAddToCart = () => {
    if (isVariationOutOfStock || isAdding) return
    setIsAdding(true)

    setTimeout(() => {
      if (onAddToCart) {
        onAddToCart(productId, selectedVariationId || null, quantity)
      } else {
        const varAttrs = selectedVariation?.attributes as Record<string, unknown> | null
        addItem({
          productId,
          variationId: selectedVariationId || null,
          name: productName || 'Product',
          slug: productSlug || productId,
          price: currentPrice,
          weightKg: currentWeight,
          imageUrl: imageUrl || null,
          variationAttributes: varAttrs,
          quantity,
          stock: currentStock,
        })
      }
      setIsAdding(false)
      setAddedSuccess(true)
      setTimeout(() => setAddedSuccess(false), 2500)
    }, 400)
  }

  const variationOptions = activeVariations.map((v) => {
    let label = `Variation`
    if (v.attributes && typeof v.attributes === 'object') {
      label = Object.entries(v.attributes as Record<string, unknown>)
        .map(([k, val]) => `${k}: ${val}`)
        .join(', ')
    } else if (v.sku) {
      label = `SKU: ${v.sku}`
    }
    return {
      label: `${label} - ${formatPriceWithSymbol(v.price, settings.store_currency.symbol)} (${v.weight_kg}kg)`,
      value: v.id,
      disabled: v.stock <= 0,
    }
  })

  return (
    <div className={cn('flex flex-col gap-6 p-6 rounded-2xl border border-border bg-surface shadow-xs', className)}>
      {/* Price & Weight summary */}
      <div className="flex items-baseline justify-between gap-4">
        <PriceTag amount={currentPrice} currency={currency} size="lg" />
        {currentWeight !== null && currentWeight !== undefined && (
          <WeightTag weightKg={currentWeight} size="md" />
        )}
      </div>

      {/* Variation selector if available */}
      {hasVariations && activeVariations.length > 0 && (
        <div className="space-y-1.5">
          <Select
            label="Select Option"
            value={selectedVariationId}
            onChange={(e) => setSelectedVariationId(e.target.value)}
            options={variationOptions}
            disabled={isAdding}
          />
        </div>
      )}

      {/* Quantity & Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            Qty
          </span>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={Math.min(99, currentStock > 0 ? currentStock : 1)}
            disabled={isVariationOutOfStock || isAdding}
          />
        </div>

        <Button
          size="lg"
          variant={isVariationOutOfStock ? 'secondary' : addedSuccess ? 'secondary' : 'primary'}
          disabled={isVariationOutOfStock || isAdding}
          isLoading={isAdding}
          onClick={handleAddToCart}
          className="flex-1 font-semibold"
        >
          {isVariationOutOfStock
            ? 'Out of Stock'
            : addedSuccess
            ? '✓ Added to Cart'
            : 'Add to Cart'}
        </Button>
      </div>

      {addedSuccess && (
        <p className="text-xs text-center text-emerald-600 font-medium animate-pulse">
          Added {quantity} item(s) to your cart!
        </p>
      )}
    </div>
  )
}
