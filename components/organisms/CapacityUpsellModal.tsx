'use client'

import React, { useEffect, useState } from 'react'
import { useCart } from '@/context/CartContext'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { WeightTag } from '@/components/atoms/WeightTag'
import { Spinner } from '@/components/atoms/Spinner'
import {
  useCapacityUpsell,
  ProductWithDetails,
  formatWeightGrams,
} from '@/hooks/useCapacityUpsell'

export interface CapacityUpsellModalProps {
  isOpen: boolean
  onClose: () => void
  onContinueOrder?: () => void
  continueText?: string
  countryId?: string | null
  coveredCapacityGrams: number
  cartWeightGrams: number
}

export const CapacityUpsellModal: React.FC<CapacityUpsellModalProps> = ({
  isOpen,
  onClose,
  onContinueOrder,
  continueText = 'Continue to checkout',
  countryId,
  coveredCapacityGrams,
  cartWeightGrams,
}) => {
  const { items, addItem } = useCart()
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set())

  // Effective countryId: if coveredCapacityGrams > 0, shipping has calculated for a selected country
  const effectiveCountryId = countryId ?? (coveredCapacityGrams > 0 ? 'selected' : null)

  const { leftoverGrams, products, loading } = useCapacityUpsell({
    countryId: effectiveCountryId,
    coveredCapacityGrams,
    cartWeightGrams,
  })

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || (!loading && products.length === 0)) return null

  const handleAddProduct = (product: ProductWithDetails) => {
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

    setAddedProductIds((prev) => new Set(prev).add(product.id))
  }

  const handleContinue = () => {
    if (onContinueOrder) {
      onContinueOrder()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div
        className="fixed inset-0 bg-[#1C2521]/30 transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shipping capacity options"
        className="relative w-full max-w-2xl bg-white rounded-[4px] border border-[#E7ECE8] p-6 sm:p-8 space-y-6 z-10 my-8 shadow-xl"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#2F6B3C] bg-[#2F6B3C]/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Shipping Capacity Remaining
            </span>

            <button
              type="button"
              onClick={onClose}
              className="text-[#6B7570] hover:text-[#1C2521] p-1 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <h2 className="text-xl font-semibold text-[#1C2521] tracking-tight">
            Add items without extra shipping cost
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7570] font-normal border-l-2 border-[#2F6B3C] pl-3 py-1">
            You have <span className="font-semibold text-[#2F6B3C]">{formatWeightGrams(leftoverGrams)}</span> unused weight capacity in your current shipping tier.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-[#1C2521]">
            Items fitting your capacity
          </h3>

          {loading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-[#6B7570]">
              <Spinner size="md" /> Loading recommendations...
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {products.map((product) => {
                const sortedImages = product.product_images
                  ? [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  : []
                const imageUrl = sortedImages[0]?.url
                const firstVar = product.product_variations?.[0]
                const itemPrice = product.base_price ?? firstVar?.price ?? 0
                const itemWeightKg = product.base_weight_kg ?? firstVar?.weight_kg ?? 0
                
                const existingCartItem = items.find((i) => i.productId === product.id)
                const isAlreadyInCart = !!existingCartItem
                const isAddedThisSession = addedProductIds.has(product.id)

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-[4px] border border-[#E7ECE8] bg-white hover:border-[#2F6B3C]/30 transition-colors"
                  >
                    <div className="h-12 w-12 shrink-0 rounded-[4px] border border-[#E7ECE8] bg-white overflow-hidden flex items-center justify-center">
                      {imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <span className="text-[10px] text-[#6B7570]">No img</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-semibold text-xs text-[#1C2521] truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <PriceTag amount={itemPrice} size="sm" />
                        <WeightTag weightKg={itemWeightKg} size="sm" />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isAlreadyInCart ? 'secondary' : 'primary'}
                      onClick={() => handleAddProduct(product)}
                      className="shrink-0"
                    >
                      {isAddedThisSession ? 'Added' : isAlreadyInCart ? '+ Add 1' : '+ Add'}
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-center border border-[#E7ECE8] text-xs text-[#6B7570] rounded-[4px]">
              No matching items found within your exact remaining capacity.
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E7ECE8]">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleContinue}
            className="w-full sm:w-auto"
          >
            {continueText}
          </Button>
        </div>
      </div>
    </div>
  )
}
