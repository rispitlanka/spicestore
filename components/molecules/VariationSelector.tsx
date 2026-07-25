'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { PriceTag } from '../atoms/PriceTag'
import { WeightTag } from '../atoms/WeightTag'

export interface ProductVariation {
  id: string
  name?: string
  price: number
  originalPrice?: number
  weightKg?: number
  imageUrl?: string | null
  attributes: Record<string, string>
  stock?: number
  outOfStock?: boolean
  colorHexes?: Record<string, string>
}

export interface VariationOption {
  value: string
  label?: string
  colorHex?: string
  disabled?: boolean
}

export interface AttributeGroup {
  name: string
  options: VariationOption[]
}

export interface VariationSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  variations?: ProductVariation[]
  attributeGroups?: AttributeGroup[]
  selectedAttributes?: Record<string, string>
  selectedVariationId?: string
  onVariationChange?: (variation: ProductVariation | null) => void
  onAttributeChange?: (attributeName: string, value: string, selectedAttrs: Record<string, string>) => void
  showDetailsSummary?: boolean
  currency?: string
}

export const VariationSelector: React.FC<VariationSelectorProps> = ({
  variations = [],
  attributeGroups,
  selectedAttributes: externalSelectedAttrs,
  selectedVariationId,
  onVariationChange,
  onAttributeChange,
  showDetailsSummary = true,
  currency = 'USD',
  className,
  ...props
}) => {
  const derivedGroups = React.useMemo<AttributeGroup[]>(() => {
    if (attributeGroups && attributeGroups.length > 0) return attributeGroups
    if (!variations || variations.length === 0) return []

    const groupMap: Record<string, Set<string>> = {}

    variations.forEach((v) => {
      Object.entries(v.attributes || {}).forEach(([attrName, attrValue]) => {
        if (!groupMap[attrName]) {
          groupMap[attrName] = new Set()
        }
        groupMap[attrName].add(attrValue)
      })
    })

    return Object.entries(groupMap).map(([name, valuesSet]) => ({
      name,
      options: Array.from(valuesSet).map((val) => ({
        value: val,
        label: val,
      })),
    }))
  }, [variations, attributeGroups])

  const [internalSelectedAttrs, setInternalSelectedAttrs] = React.useState<Record<string, string>>(() => {
    if (externalSelectedAttrs) return externalSelectedAttrs

    if (selectedVariationId && variations.length > 0) {
      const match = variations.find((v) => v.id === selectedVariationId)
      if (match) return match.attributes
    }

    if (variations.length > 0) {
      const availableVar = variations.find((v) => !v.outOfStock && (v.stock === undefined || v.stock > 0))
      if (availableVar) return availableVar.attributes || {}
      return variations[0].attributes || {}
    }

    const initial: Record<string, string> = {}
    derivedGroups.forEach((g) => {
      if (g.options.length > 0) {
        initial[g.name] = g.options[0].value
      }
    })
    return initial
  })

  const currentAttrs = externalSelectedAttrs ?? internalSelectedAttrs

  const currentVariation = React.useMemo<ProductVariation | null>(() => {
    if (!variations || variations.length === 0) return null

    return (
      variations.find((v) => {
        return Object.entries(currentAttrs).every(([key, val]) => v.attributes[key] === val)
      }) || null
    )
  }, [variations, currentAttrs])

  const handleSelectAttribute = (groupName: string, optionValue: string) => {
    const nextAttrs = {
      ...currentAttrs,
      [groupName]: optionValue,
    }

    if (!externalSelectedAttrs) {
      setInternalSelectedAttrs(nextAttrs)
    }

    const matchingVar =
      variations.find((v) => {
        return Object.entries(nextAttrs).every(([key, val]) => v.attributes[key] === val)
      }) || null

    if (onAttributeChange) {
      onAttributeChange(groupName, optionValue, nextAttrs)
    }

    if (onVariationChange) {
      onVariationChange(matchingVar)
    }
  }

  if (derivedGroups.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-4 font-sans', className)} {...props}>
      {derivedGroups.map((group) => {
        const selectedValue = currentAttrs[group.name]

        return (
          <div key={group.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#1C2521]">
              <span>{group.name}</span>
              {selectedValue && (
                <span className="font-normal text-[#6B7570]">{selectedValue}</span>
              )}
            </div>

            <div
              role="radiogroup"
              aria-label={`Select ${group.name}`}
              className="flex flex-wrap gap-2"
            >
              {group.options.map((option) => {
                const isSelected = selectedValue === option.value
                const testAttrs = { ...currentAttrs, [group.name]: option.value }
                const testVar = variations.find((v) =>
                  Object.entries(testAttrs).every(([k, val]) => v.attributes[k] === val)
                )
                const isUnavailable = !testVar || Boolean(testVar.outOfStock) || (testVar.stock !== undefined && testVar.stock <= 0)

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={option.disabled || isUnavailable}
                    onClick={() => handleSelectAttribute(group.name, option.value)}
                    className={cn(
                      'min-h-[44px] px-3.5 py-2 rounded-[4px] text-xs font-medium transition-colors cursor-pointer select-none border inline-flex items-center justify-center touch-manipulation',
                      isSelected
                        ? 'border-[#2F6B3C] bg-white text-[#2F6B3C]'
                        : 'border-[#E7ECE8] bg-white text-[#1C2521] hover:border-gray-400',
                      isUnavailable && 'opacity-40 cursor-not-allowed line-through'
                    )}
                  >
                    {option.label || option.value}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {showDetailsSummary && currentVariation && (
        <div className="mt-1 p-3 rounded-[4px] bg-white border border-[#E7ECE8] flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            {currentVariation.imageUrl && (
              <img
                src={currentVariation.imageUrl}
                alt={currentVariation.name || 'Variation preview'}
                className="w-10 h-10 object-cover rounded-[4px] border border-[#E7ECE8] shrink-0"
              />
            )}
            <div className="flex flex-col">
              <PriceTag
                amount={currentVariation.price}
                originalAmount={currentVariation.originalPrice}
                currency={currency}
                size="sm"
              />
              {currentVariation.weightKg !== undefined && currentVariation.weightKg !== null && (
                <div className="mt-0.5">
                  <WeightTag weightKg={currentVariation.weightKg} size="sm" />
                </div>
              )}
            </div>
          </div>

          <div>
            {currentVariation.outOfStock ? (
              <span className="text-xs font-medium text-[#6B7570]">
                Out of Stock
              </span>
            ) : currentVariation.stock !== undefined ? (
              <span className="text-xs text-[#6B7570] font-normal">
                {currentVariation.stock} left in stock
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
