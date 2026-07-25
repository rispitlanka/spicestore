'use client'

import React from 'react'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { WeightTag } from '@/components/atoms/WeightTag'
import { ProductWithDetails, formatWeightGrams } from '@/hooks/useCapacityUpsell'
import { useCart } from '@/context/CartContext'

export interface CapacityUpsellCardProps {
  leftoverGrams: number
  products: ProductWithDetails[]
  onOpenModal: () => void
  className?: string
}

export const CapacityUpsellCard: React.FC<CapacityUpsellCardProps> = ({
  leftoverGrams,
  products,
  onOpenModal,
  className = '',
}) => {
  const { items, addItem } = useCart()

  if (leftoverGrams < 100 || products.length === 0) {
    return null
  }

  const topProduct = products[0]

  const handleAddProduct = (product: ProductWithDetails, e: React.MouseEvent) => {
    e.stopPropagation()
    const sortedImages = product.product_images
      ? [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : []

    const firstVariation = product.product_variations?.[0]
    const price = product.base_price ?? firstVariation?.price ?? 0
    const weightKg = product.base_weight_kg ?? firstVariation?.weight_kg ?? 0
    const imageUrl = sortedImages[0]?.url || null

    addItem({
      productId: product.id,
      variationId: firstVariation?.id || null,
      name: product.name,
      slug: product.slug,
      price,
      weightKg,
      imageUrl,
      quantity: 1,
    })
  }

  return (
    <div
      className={`border border-[#2F6B3C]/20 bg-[#F4F6F4] rounded-sm p-4 space-y-3 font-sans transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F6B3C] bg-[#2F6B3C]/10 px-2 py-0.5 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {formatWeightGrams(leftoverGrams)} Unused Shipping Capacity
            </span>
          </div>

          <p className="text-xs text-[#1C2521] font-medium leading-snug">
            Add items to your order without extra shipping cost!
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenModal}
          className="shrink-0 text-xs py-1.5"
        >
          View All ({products.length})
        </Button>
      </div>

      {topProduct && (
        <div className="pt-2 border-t border-[#2F6B3C]/10 flex items-center justify-between gap-3 bg-white p-2.5 rounded-[4px] border border-[#E7ECE8]">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-semibold text-xs text-[#1C2521] truncate">{topProduct.name}</p>
            <div className="flex items-center gap-2 text-xs">
              <PriceTag amount={topProduct.base_price ?? topProduct.product_variations?.[0]?.price ?? 0} size="sm" />
              <WeightTag weightKg={topProduct.base_weight_kg ?? topProduct.product_variations?.[0]?.weight_kg ?? 0} size="sm" />
            </div>
          </div>

          <Button
            type="button"
            variant={items.some((i) => i.productId === topProduct.id) ? 'secondary' : 'primary'}
            size="sm"
            onClick={(e) => handleAddProduct(topProduct, e)}
            className="shrink-0 text-xs"
          >
            {items.some((i) => i.productId === topProduct.id) ? '+ Add 1' : '+ Add'}
          </Button>
        </div>
      )}
    </div>
  )
}
