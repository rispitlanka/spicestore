/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart, CartItem } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { validateCoupon, Coupon } from '@/lib/coupons/validate'
import { calculateShipping, CalculateShippingResult } from '@/lib/shipping/calculate'
import { QuantitySelector } from '@/components/molecules/QuantitySelector'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { EmptyState } from '@/components/atoms/EmptyState'
import { CouponInput } from '@/components/molecules/CouponInput'
import { CountrySelect } from '@/components/molecules/CountrySelect'
import { CapacityUpsellCard } from '@/components/molecules/CapacityUpsellCard'
import { CapacityUpsellModal } from '@/components/organisms/CapacityUpsellModal'
import { useCapacityUpsell } from '@/hooks/useCapacityUpsell'


interface AppliedCouponState {
  code: string
  id: string
  discountAmount: number
  coupon: Coupon
}

const APPLIED_COUPON_KEY = 'yarlsamayal_applied_coupon'

export default function CartPage() {
  const router = useRouter()
  const {
    items,
    selectedCountryId,
    savedDefaultCountryId,
    setSelectedCountryId,
    isHydrated,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    totalWeightKg,
    totalItems,
  } = useCart()
  const { user } = useAuth()
  const { settings } = useSettings()

  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponState | null>(null)
  const [shippingResult, setShippingResult] = useState<CalculateShippingResult | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)

  // Upsell Modal state
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false)

  const totalWeightGrams = Math.round(totalWeightKg * 1000)

  const { leftoverGrams, isEligible, products } = useCapacityUpsell({
    countryId: selectedCountryId,
    coveredCapacityGrams: shippingResult?.coveredCapacityGrams ?? 0,
    cartWeightGrams: totalWeightGrams,
  })

  // Reset auto-open flag if selected country changes
  useEffect(() => {
    setHasAutoOpenedModal(false)
  }, [selectedCountryId])

  // Auto open upsell modal once on country select if eligible and shipping calculation complete
  useEffect(() => {
    if (isEligible && !isCalculatingShipping && !hasAutoOpenedModal) {
      setShowUpsellModal(true)
      setHasAutoOpenedModal(true)
    }
  }, [isEligible, isCalculatingShipping, hasAutoOpenedModal])


  // Live shipping calculation on country change or cart weight change
  useEffect(() => {
    if (selectedCountryId && totalWeightGrams > 0) {
      setIsCalculatingShipping(true)
      calculateShipping(selectedCountryId, totalWeightGrams)
        .then((res) => setShippingResult(res))
        .catch((err) => {
          console.error('Failed to calculate shipping:', err)
          setShippingResult(null)
        })
        .finally(() => setIsCalculatingShipping(false))
    } else {
      setShippingResult(null)
    }
  }, [selectedCountryId, totalWeightGrams])

  // Sync coupon with sessionStorage and re-validate when cart contents change
  useEffect(() => {
    if (!isHydrated) return

    const savedCode = typeof window !== 'undefined' ? sessionStorage.getItem(APPLIED_COUPON_KEY) : null

    if (savedCode && items.length > 0) {
      validateCoupon(savedCode, items, subtotal, user?.id).then((result) => {
        if (result.valid && result.coupon && result.discountAmount !== undefined) {
          setAppliedCoupon({
            code: result.coupon.code,
            id: result.coupon.id,
            discountAmount: result.discountAmount,
            coupon: result.coupon,
          })
        } else {
          setAppliedCoupon(null)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(APPLIED_COUPON_KEY)
          }
        }
      })
    } else {
      setAppliedCoupon(null)
      if (items.length === 0 && typeof window !== 'undefined') {
        sessionStorage.removeItem(APPLIED_COUPON_KEY)
      }
    }
  }, [items, subtotal, user?.id, isHydrated])

  const handleApplyCoupon = async (code: string) => {
    try {
      const result = await validateCoupon(code, items, subtotal, user?.id)

      if (result.valid && result.coupon && result.discountAmount !== undefined) {
        setAppliedCoupon({
          code: result.coupon.code,
          id: result.coupon.id,
          discountAmount: result.discountAmount,
          coupon: result.coupon,
        })
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(APPLIED_COUPON_KEY, result.coupon.code)
        }
        return {
          success: true,
          message: `Coupon "${code.toUpperCase()}" applied (${formatPriceWithSymbol(result.discountAmount, settings.store_currency.symbol)} off)!`,
        }
      } else {
        return {
          success: false,
          message: result.reason || 'Invalid or expired coupon code.',
        }
      }
    } catch (err) {
      console.error('Coupon validation error:', err)
      return {
        success: false,
        message: 'An error occurred while validating coupon code.',
      }
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(APPLIED_COUPON_KEY)
    }
  }

  const handleProceedToCheckout = () => {
    router.push('/checkout')
  }

  const currentDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0
  const shippingCost = selectedCountryId && shippingResult ? shippingResult.cost : 0
  const finalTotal = Math.max(0, subtotal - currentDiscount) + shippingCost

  const formatBreakdownText = () => {
    if (!shippingResult || !shippingResult.breakdown || shippingResult.breakdown.length === 0) {
      return null
    }
    return shippingResult.breakdown
      .map((item) => `${item.count > 1 ? `${item.count}×` : ''}${item.weightKg}kg tier`)
      .join(' + ')
  }

  const breakdownText = formatBreakdownText()

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-white py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex items-center justify-center font-sans text-sm text-[#6B7570]">
        Loading cart...
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto font-sans">
        <div className="border border-[#E7ECE8] rounded-sm p-12 text-center">
          <EmptyState
            title="Your cart is empty"
            description="You haven't added any products to your shopping cart yet."
            action={
              <Link href="/">
                <Button variant="primary" size="md">
                  Continue Shopping
                </Button>
              </Link>
            }
          />
        </div>
      </main>
    )
  }

  const formatVariationLabel = (item: CartItem) => {
    if (item.variationAttributes) {
      const values = Object.values(item.variationAttributes).filter(Boolean)
      if (values.length > 0) {
        return values.join(' / ')
      }
    }
    if (item.weightKg) {
      return item.weightKg < 1 ? `${Math.round(item.weightKg * 1000)}g` : `${item.weightKg}kg`
    }
    return null
  }

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto font-sans space-y-8">
      {/* Page Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Shopping Cart ({totalItems})
          </h1>
        </div>

        <Link
          href="/"
          className="text-xs text-[#6B7570] hover:text-[#1C2521] underline transition-colors min-h-[44px] inline-flex items-center"
        >
          ← Continue Shopping
        </Link>
      </div>

      {/* Two Column Grid on Desktop (min-width lg / 1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Wider, ~65% -> lg:col-span-7): Cart items list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-[#E7ECE8] rounded-sm overflow-hidden bg-white divide-y divide-[#E7ECE8]">
            <div className="px-4 py-3 bg-white flex items-center justify-between text-xs text-[#6B7570]">
              <span>Product Details</span>
              <button
                type="button"
                onClick={clearCart}
                className="hover:text-[#1C2521] underline cursor-pointer min-h-[44px] inline-flex items-center"
              >
                Clear all
              </button>
            </div>

            {items.map((item) => {
              const variationLabel = formatVariationLabel(item)

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Thumbnail & Title/Details */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-16 h-16 shrink-0 rounded-sm border border-[#E7ECE8] overflow-hidden bg-white flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#6B7570]">No image</span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/products/${item.slug}`}
                        className="text-sm font-semibold text-[#1C2521] hover:text-[#2F6B3C] transition-colors truncate block"
                      >
                        {item.name}
                      </Link>

                      {variationLabel && (
                        <p className="text-xs text-[#6B7570] font-normal">
                          {variationLabel}
                        </p>
                      )}

                      <PriceTag amount={item.price} size="sm" />
                    </div>
                  </div>

                  {/* Quantity, Line Total, Remove Link */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7ECE8]">
                    <QuantitySelector
                      size="sm"
                      value={item.quantity}
                      max={item.stock ?? 99}
                      onChange={(q) => updateQuantity(item.id, q)}
                    />

                    <div className="text-right min-w-[4.5rem]">
                      <PriceTag amount={item.price * item.quantity} size="sm" />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-[#6B7570] hover:text-[#1C2521] underline transition-colors cursor-pointer min-h-[44px] inline-flex items-center"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Continue Shopping Link below left column */}
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs text-[#6B7570] hover:text-[#1C2521] underline transition-colors inline-flex items-center min-h-[44px]"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right Column (~35% -> lg:col-span-5): Sticky Order Summary Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="border border-[#E7ECE8] rounded-sm p-6 space-y-5 bg-white">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Order Summary
            </h2>

            {/* Breakdown Totals */}
            <div className="space-y-3 text-xs sm:text-sm text-[#6B7570]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <PriceTag amount={subtotal} size="sm" />
              </div>

              <div className="flex justify-between">
                <span>Total Weight</span>
                <span className="text-[#1C2521] font-medium">{totalWeightKg.toFixed(2)} kg</span>
              </div>
            </div>

            {/* Country Selection */}
            <div className="border-t border-[#E7ECE8] pt-4">
              <CountrySelect
                value={selectedCountryId}
                onCountryChange={(id) => setSelectedCountryId(id, { saveAsDefault })}
                label="Destination Country"
                helperText="Select country to calculate shipping"
              />
              {selectedCountryId && selectedCountryId !== savedDefaultCountryId && (
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cart-save-default-country"
                    checked={saveAsDefault}
                    onChange={(e) => {
                      const isChecked = e.target.checked
                      setSaveAsDefault(isChecked)
                      if (isChecked && selectedCountryId) {
                        setSelectedCountryId(selectedCountryId, { saveAsDefault: true })
                      }
                    }}
                    className="w-4 h-4 rounded border-[#E7ECE8] text-[#2F6B3C] focus:ring-[#2F6B3C] accent-[#2F6B3C] cursor-pointer"
                  />
                  <label
                    htmlFor="cart-save-default-country"
                    className="text-xs text-[#6B7570] cursor-pointer select-none"
                  >
                    Set as my default delivery country
                  </label>
                </div>
              )}
            </div>

            {/* Capacity Upsell Banner */}
            {selectedCountryId && (
              <CapacityUpsellCard
                leftoverGrams={leftoverGrams}
                products={products}
                onOpenModal={() => setShowUpsellModal(true)}
              />
            )}

            {/* Coupon Input */}
            <div className="border-t border-[#E7ECE8] pt-4">
              <CouponInput
                onApply={handleApplyCoupon}
                onRemove={handleRemoveCoupon}
                appliedCode={appliedCoupon?.code || null}
                discountText={appliedCoupon ? `-${formatPriceWithSymbol(appliedCoupon.discountAmount, settings.store_currency.symbol)}` : null}
                placeholder="Enter coupon code"
              />
            </div>

            {/* Summary Totals */}
            <div className="border-t border-[#E7ECE8] pt-4 space-y-3 text-xs sm:text-sm text-[#6B7570]">
              {appliedCoupon && (
                <div className="flex justify-between text-[#2F6B3C] font-medium">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatPriceWithSymbol(appliedCoupon.discountAmount, settings.store_currency.symbol)}</span>
                </div>
              )}

              <div className="flex justify-between items-start">
                <span>Shipping</span>
                <div className="text-right">
                  {isCalculatingShipping ? (
                    <span className="text-[#1C2521] font-medium">Calculating...</span>
                  ) : selectedCountryId && shippingResult ? (
                    <div>
                      <PriceTag amount={shippingResult.cost} size="sm" />
                      {breakdownText && (
                        <span className="block text-[11px] text-[#6B7570] font-normal">
                          ({breakdownText})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#6B7570] font-normal">Select country</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-baseline text-base font-semibold text-[#1C2521] pt-2 border-t border-[#E7ECE8]">
                <span>Total</span>
                <PriceTag amount={finalTotal} size="lg" />
              </div>

              <p className="text-xs text-[#6B7570] font-normal">
                {selectedCountryId
                  ? 'Includes estimated shipping to destination'
                  : 'Select country to calculate shipping'}
              </p>
            </div>

            {/* Primary Proceed to Checkout Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleProceedToCheckout}
              disabled={isCalculatingShipping}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>

      </div>

      {/* Fill the Bracket Capacity Upsell Modal */}
      <CapacityUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        onContinueOrder={() => {
          setShowUpsellModal(false)
          router.push('/checkout')
        }}
        continueText="Proceed to Checkout"
        countryId={selectedCountryId}
        coveredCapacityGrams={shippingResult?.coveredCapacityGrams ?? 0}
        cartWeightGrams={totalWeightGrams}
      />
    </main>

  )
}
