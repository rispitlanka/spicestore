'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertBaseAmount } from '@/lib/currency'
import { calculateShipping, CalculateShippingResult } from '@/lib/shipping/calculate'
import { validateCoupon, Coupon } from '@/lib/coupons/validate'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { formatPriceWithSymbol } from '@/lib/settings'
import { Spinner } from '@/components/atoms/Spinner'
import { EmptyState } from '@/components/atoms/EmptyState'
import { CountrySelect } from '@/components/molecules/CountrySelect'
import { CouponInput } from '@/components/molecules/CouponInput'
import { AddressForm, AddressFormData, AddressFormErrors } from '@/components/molecules/AddressForm'
import { CapacityUpsellModal } from '@/components/organisms/CapacityUpsellModal'
import { useCapacityUpsell } from '@/hooks/useCapacityUpsell'
import { Tables } from '@/types/database'


interface FormErrors extends AddressFormErrors {
  name?: string
  email?: string
  phone?: string
  country?: string
}

interface AppliedCouponState {
  code: string
  id: string
  discountAmount: number
  coupon: Coupon
}

export default function CheckoutPage() {
  const router = useRouter()
  const {
    items,
    selectedCountryId,
    savedDefaultCountryId,
    setSelectedCountryId,
    isHydrated,
    subtotal,
    totalWeightKg,
    totalItems,
    clearCart,
  } = useCart()
  const { user, profile } = useAuth()
  const { settings } = useSettings()
  const { currency: activeCurrencyCode, rates: currentRates } = useCurrency()

  const [saveAsDefaultCountry, setSaveAsDefaultCountry] = useState(false)
  const [saveAsDefaultAddress, setSaveAsDefaultAddress] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    postalCode: '',
    countryId: '',
  })
  const [isPrefilled, setIsPrefilled] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Tables<'countries'> | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponState | null>(null)

  const APPLIED_COUPON_KEY = 'yarlsamayal_applied_coupon'

  // Mobile Order Summary Accordion state
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false)

  // Upsell Modal state
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [hasSeenUpsellModal, setHasSeenUpsellModal] = useState(false)

  // Determine if selected country is Sri Lanka
  const isSriLanka =
    selectedCountry?.code?.toUpperCase() === 'LK' ||
    selectedCountry?.name?.toLowerCase() === 'sri lanka'

  // Prefill countryId from CartContext if already selected on cart page
  useEffect(() => {
    if (isHydrated && selectedCountryId && !formData.countryId) {
      setFormData((prev) => ({ ...prev, countryId: selectedCountryId }))
    }
  }, [isHydrated, selectedCountryId, formData.countryId])

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

  // Prefill user delivery information from profile
  useEffect(() => {
    if (user && !isPrefilled) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || profile?.full_name || user.user_metadata?.full_name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || profile?.phone || '',
        addressLine1: prev.addressLine1 || profile?.default_address_line1 || '',
        addressLine2: prev.addressLine2 || profile?.default_address_line2 || '',
        city: prev.city || profile?.default_city || '',
        district: prev.district || profile?.default_district || '',
        postalCode: prev.postalCode || profile?.default_postal_code || '',
      }))
      setIsPrefilled(true)
    }
  }, [user, profile, isPrefilled])

  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [shippingResult, setShippingResult] = useState<CalculateShippingResult | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const totalWeightGrams = Math.round(totalWeightKg * 1000)

  const runShippingCalculation = useCallback(
    async (countryId: string, weightGrams: number) => {
      if (!countryId || weightGrams <= 0) {
        setShippingResult(null)
        return
      }

      try {
        setIsCalculatingShipping(true)
        const result = await calculateShipping(countryId, weightGrams)
        setShippingResult(result)
      } catch (err) {
        console.error('Failed to calculate shipping:', err)
        setShippingResult(null)
      } finally {
        setIsCalculatingShipping(false)
      }
    },
    []
  )

  useEffect(() => {
    if (formData.countryId && totalWeightGrams > 0) {
      runShippingCalculation(formData.countryId, totalWeightGrams)
    }
  }, [formData.countryId, totalWeightGrams, runShippingCalculation])

  const handleCountryChange = (countryId: string, country?: Tables<'countries'>) => {
    setFormData((prev) => ({ ...prev, countryId }))
    setSelectedCountryId(countryId, { saveAsDefault: saveAsDefaultCountry })
    setSelectedCountry(country || null)
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: undefined }))
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleAddressChange = (field: keyof AddressFormData, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.countryId) newErrors.country = 'Please select a destination country'

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address Line 1 is required'
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City / Town is required'
    }

    if (isSriLanka && !formData.district.trim()) {
      newErrors.district = 'Please select a district for Sri Lanka delivery'
    }

    if (isSriLanka && formData.postalCode.trim()) {
      const digitsOnly = formData.postalCode.trim().replace(/\D/g, '')
      if (digitsOnly.length !== 5) {
        newErrors.postalCode = 'Sri Lankan postal code should be 5 digits (e.g. 40000)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const proceedWithOrderPlacement = async () => {
    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const serverShipping = await calculateShipping(formData.countryId, totalWeightGrams)
      const shippingCost = serverShipping ? serverShipping.cost : 0

      let verifiedDiscount = 0
      let verifiedCoupon: Coupon | null = null

      if (appliedCoupon) {
        const coupRes = await validateCoupon(appliedCoupon.code, items, subtotal, user?.id)
        if (!coupRes.valid || !coupRes.coupon) {
          throw new Error(coupRes.reason || 'Applied coupon code is no longer valid.')
        }
        verifiedDiscount = coupRes.discountAmount ?? 0
        verifiedCoupon = coupRes.coupon
      }

      const totalAmount = Math.max(0, subtotal - verifiedDiscount) + shippingCost
      const supabase = createClient() as any

      // 1. Save default address to profile if logged in and customer explicitly opted in
      if (user?.id && saveAsDefaultAddress) {
        await supabase
          .from('customer_profiles')
          .update({
            default_address_line1: formData.addressLine1.trim(),
            default_address_line2: formData.addressLine2.trim() || null,
            default_city: formData.city.trim(),
            default_district: formData.district.trim() || null,
            default_postal_code: formData.postalCode.trim() || null,
          })
          .eq('id', user.id)
      }

      // Lock exchange rate & totals at order placement (CRITICAL for COD accuracy).
      // DO NOT RECALCULATE. Once an order is placed, its displayed total and exchange rate are frozen permanently for COD cash collection and historical accuracy.
      const displayCurrencyCode = activeCurrencyCode || 'USD'
      const exchangeRateUsed = currentRates[displayCurrencyCode] || 1.0
      const displayConverted = convertBaseAmount(totalAmount, exchangeRateUsed, displayCurrencyCode)
      const totalAmountDisplay = displayConverted.amount

      // 2. Insert order record
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          guest_name: formData.name.trim(),
          guest_email: formData.email.trim(),
          guest_phone: formData.phone.trim(),
          address_line1: formData.addressLine1.trim(),
          address_line2: formData.addressLine2.trim() || null,
          city: formData.city.trim(),
          district: formData.district.trim() || null,
          postal_code: formData.postalCode.trim() || null,
          country_id: formData.countryId,
          coupon_id: verifiedCoupon?.id || null,
          subtotal: Number(subtotal.toFixed(2)),
          subtotal_base: Number(subtotal.toFixed(2)),
          discount_amount: Number(verifiedDiscount.toFixed(2)),
          total_weight_kg: Number(totalWeightKg.toFixed(3)),
          shipping_cost: Number(shippingCost.toFixed(2)),
          shipping_cost_base: Number(shippingCost.toFixed(2)),
          total_amount: Number(totalAmount.toFixed(2)),
          total_amount_base: Number(totalAmount.toFixed(2)),
          display_currency_code: displayCurrencyCode,
          exchange_rate_used: Number(exchangeRateUsed.toFixed(6)),
          total_amount_display: Number(totalAmountDisplay.toFixed(2)),
          payment_method: 'Cash on Delivery',
          status: 'pending',
        })
        .select('id')
        .single()

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message || 'Failed to create order record.')
      }

      const orderId = orderData.id

      const orderItemsToInsert = items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        variation_id: item.variationId || null,
        quantity: item.quantity,
        unit_price: Number(item.price.toFixed(2)),
        unit_weight_kg: Number(item.weightKg.toFixed(3)),
      }))

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert)

      if (itemsErr) {
        throw new Error(itemsErr.message || 'Failed to record order items.')
      }

      if (verifiedCoupon && verifiedCoupon.id) {
        await supabase.from('coupon_redemptions').insert({
          coupon_id: verifiedCoupon.id,
          order_id: orderId,
          customer_id: user?.id || null,
        })

        const { data: cData } = await supabase
          .from('coupons')
          .select('usage_count')
          .eq('id', verifiedCoupon.id)
          .single()

        if (cData) {
          await supabase
            .from('coupons')
            .update({ usage_count: (cData.usage_count || 0) + 1 })
            .eq('id', verifiedCoupon.id)
        }
      }

      for (const item of items) {
        let success = false

        if (item.variationId) {
          const { data, error: rpcErr } = await supabase.rpc('decrement_variation_stock', {
            p_variation_id: item.variationId,
            p_quantity: item.quantity,
          })
          if (!rpcErr && data === true) {
            success = true
          }
        } else {
          const { data, error: rpcErr } = await supabase.rpc('decrement_product_stock', {
            p_product_id: item.productId,
            p_quantity: item.quantity,
          })
          if (!rpcErr && data === true) {
            success = true
          }
        }

        if (!success) {
          if (item.variationId) {
            const { data: v } = await supabase
              .from('product_variations')
              .select('stock')
              .eq('id', item.variationId)
              .maybeSingle()

            if (v && v.stock != null) {
              if (v.stock < item.quantity) {
                throw new Error(`Insufficient stock for "${item.name}". Only ${v.stock} item(s) available.`)
              }
              const newStock = v.stock - item.quantity
              await supabase
                .from('product_variations')
                .update({ stock: newStock })
                .eq('id', item.variationId)
            }
          } else {
            const { data: vars } = await supabase
              .from('product_variations')
              .select('id, stock')
              .eq('product_id', item.productId)

            if (vars && vars.length > 0) {
              const targetVar = vars[0]
              if (targetVar && targetVar.stock != null) {
                if (targetVar.stock < item.quantity) {
                  throw new Error(`Insufficient stock for "${item.name}". Only ${targetVar.stock} item(s) available.`)
                }
                const newStock = targetVar.stock - item.quantity
                await supabase
                  .from('product_variations')
                  .update({ stock: newStock })
                  .eq('id', targetVar.id)
              }
            }
          }
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(APPLIED_COUPON_KEY)
      }
      clearCart()
      router.push(`/order-confirmation/${orderId.substring(0, 8)}`)
    } catch (err: unknown) {
      console.error('Order submission error:', err)
      const message =
        err instanceof Error ? err.message : 'An error occurred while placing your order.'
      setSubmitError(message)
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) return
    if (items.length === 0) {
      setSubmitError('Your cart is empty.')
      return
    }

    const leftoverGrams = (shippingResult?.coveredCapacityGrams ?? 0) - totalWeightGrams
    if (leftoverGrams >= 100 && !hasSeenUpsellModal) {
      setShowUpsellModal(true)
      setHasSeenUpsellModal(true)
      return
    }

    await proceedWithOrderPlacement()
  }

  const handleContinueOrderFromUpsell = async () => {
    setShowUpsellModal(false)
    await proceedWithOrderPlacement()
  }

  const shippingCost = shippingResult ? shippingResult.cost : 0
  const currentDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0
  const finalTotal = Math.max(0, subtotal - currentDiscount) + shippingCost

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex items-center justify-center font-sans text-sm text-[#6B7570]">
        Loading checkout...
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto font-sans">
        <div className="border border-[#E7ECE8] rounded-sm p-12 text-center space-y-6">
          <EmptyState
            title="Your cart is empty"
            description="Add items to your cart before proceeding to checkout."
            action={
              <Link href="/">
                <Button variant="primary" size="md">
                  Return to Catalog
                </Button>
              </Link>
            }
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto font-sans space-y-8">
      {/* Page Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Checkout
          </h1>
          <p className="mt-1 text-xs text-[#6B7570] font-normal">
            {settings.default_shipping_note || 'Cash on Delivery • Ships internationally'}
          </p>
        </div>

        <Link
          href="/cart"
          className="text-xs text-[#6B7570] hover:text-[#1C2521] underline transition-colors min-h-[44px] inline-flex items-center"
        >
          ← Return to Cart
        </Link>
      </div>

      {/* Neutral Error Callout */}
      {submitError && (
        <div className="p-4 rounded-sm border border-[#E7ECE8] bg-white text-[#1C2521] text-xs sm:text-sm font-normal leading-relaxed">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Mobile Collapsible Order Summary Bar (Top of Mobile View) */}
        <div className="lg:hidden border border-[#E7ECE8] rounded-sm bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
            className="w-full p-4 bg-[#F4F6F4]/50 flex items-center justify-between text-xs text-[#1C2521] font-medium cursor-pointer transition-colors hover:bg-[#F4F6F4]"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#2F6B3C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-[#2F6B3C] font-semibold">
                {isMobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}
              </span>
              <span className="text-[#6B7570]">
                ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
              <span className="text-[#6B7570] text-[10px]">
                {isMobileSummaryOpen ? '▲' : '▼'}
              </span>
            </div>

            <PriceTag amount={finalTotal} size="sm" />
          </button>

          {/* Expanded Breakdown on Mobile */}
          {isMobileSummaryOpen && (
            <div className="p-5 border-t border-[#E7ECE8] space-y-5 bg-white">
              {/* Line Items */}
              <div className="divide-y divide-[#E7ECE8] text-xs">
                {items.map((item) => (
                  <div key={item.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1C2521] truncate">{item.name}</p>
                      <p className="text-[#6B7570]">
                        Qty: {item.quantity} × <PriceTag amount={item.price} size="sm" className="inline-flex" />
                      </p>
                    </div>
                    <PriceTag amount={item.price * item.quantity} size="sm" />
                  </div>
                ))}
              </div>

              {/* Coupon Input */}
              <div className="border-t border-[#E7ECE8] pt-4">
                <CouponInput
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                  appliedCode={appliedCoupon?.code || null}
                  discountText={appliedCoupon ? `-${formatPriceWithSymbol(appliedCoupon.discountAmount, settings.store_currency.symbol)}` : null}
                  disabled={isSubmitting}
                  placeholder="Enter coupon code"
                />
              </div>

              {/* Breakdown Totals */}
              <div className="border-t border-[#E7ECE8] pt-4 space-y-2.5 text-xs text-[#6B7570]">
                <div className="flex justify-between">
                  <span>Total Weight:</span>
                  <span className="text-[#1C2521] font-normal">{totalWeightKg.toFixed(2)} kg</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <PriceTag amount={subtotal} size="sm" />
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-[#2F6B3C] font-medium">
                    <span>Discount ({appliedCoupon.code}):</span>
                    <span>-{formatPriceWithSymbol(appliedCoupon.discountAmount, settings.store_currency.symbol)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping Cost:</span>
                  <span className="text-[#1C2521] font-normal">
                    {isCalculatingShipping ? (
                      'Calculating...'
                    ) : !formData.countryId ? (
                      'Select country'
                    ) : (
                      <PriceTag amount={shippingCost} size="sm" />
                    )}
                  </span>
                </div>

                <div className="flex justify-between pt-3 border-t border-[#E7ECE8] text-sm font-semibold text-[#1C2521]">
                  <span>Total Amount:</span>
                  <PriceTag amount={finalTotal} size="sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout on Desktop (min-width lg / 1024px) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Wider, ~60% -> lg:col-span-7): Delivery Details Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border border-[#E7ECE8] rounded-sm p-6 space-y-6 bg-white">
              <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
                Delivery Details
              </h2>

              <div className="space-y-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. John Doe"
                  autoComplete="name"
                  error={errors.name}
                  disabled={isSubmitting}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. user@example.com"
                    autoComplete="email"
                    error={errors.email}
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +94 77 123 4567"
                    autoComplete="tel"
                    error={errors.phone}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <CountrySelect
                    value={formData.countryId}
                    onCountryChange={handleCountryChange}
                    error={errors.country}
                    disabled={isSubmitting}
                    helperText="Select country to calculate shipping cost"
                  />
                  {formData.countryId && formData.countryId !== savedDefaultCountryId && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="checkout-save-default-country"
                        checked={saveAsDefaultCountry}
                        onChange={(e) => {
                          const isChecked = e.target.checked
                          setSaveAsDefaultCountry(isChecked)
                          if (isChecked && formData.countryId) {
                            setSelectedCountryId(formData.countryId, { saveAsDefault: true })
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-4 h-4 rounded border-[#E7ECE8] text-[#2F6B3C] focus:ring-[#2F6B3C] accent-[#2F6B3C] cursor-pointer"
                      />
                      <label
                        htmlFor="checkout-save-default-country"
                        className="text-xs text-[#6B7570] cursor-pointer select-none"
                      >
                        Set as my default delivery country
                      </label>
                    </div>
                  )}
                </div>

                {/* Structured Address Form */}
                <div className="pt-2 border-t border-[#E7ECE8] space-y-4">
                  <AddressForm
                    value={{
                      addressLine1: formData.addressLine1,
                      addressLine2: formData.addressLine2,
                      city: formData.city,
                      district: formData.district,
                      postalCode: formData.postalCode,
                    }}
                    onChange={handleAddressChange}
                    errors={{
                      addressLine1: errors.addressLine1,
                      addressLine2: errors.addressLine2,
                      city: errors.city,
                      district: errors.district,
                      postalCode: errors.postalCode,
                    }}
                    isSriLanka={isSriLanka}
                    disabled={isSubmitting}
                  />

                  {user && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="checkout-save-default-address"
                        checked={saveAsDefaultAddress}
                        onChange={(e) => setSaveAsDefaultAddress(e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 rounded border-[#E7ECE8] text-[#2F6B3C] focus:ring-[#2F6B3C] accent-[#2F6B3C] cursor-pointer"
                      />
                      <label
                        htmlFor="checkout-save-default-address"
                        className="text-xs text-[#6B7570] cursor-pointer select-none"
                      >
                        Save as my default delivery address
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Submit Box (Bottom of Left Column on Mobile) */}
            <div className="lg:hidden border border-[#E7ECE8] rounded-sm p-6 space-y-4 bg-white">
              <div className="flex justify-between items-center text-sm font-semibold text-[#1C2521]">
                <span>Total to pay:</span>
                <PriceTag amount={finalTotal} size="md" />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting || isCalculatingShipping || !formData.countryId}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Placing Order...
                  </span>
                ) : (
                  `Place Order • ${formatPriceWithSymbol(finalTotal, settings.store_currency.symbol)}`
                )}
              </Button>
            </div>
          </div>

          {/* Right Column (~40% -> lg:col-span-5): Sticky Order Summary Card on Desktop */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="border border-[#E7ECE8] rounded-sm p-6 space-y-6 bg-white">
              <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
                Order Summary
              </h2>

              {/* Line items breakdown */}
              <div className="divide-y divide-[#E7ECE8] text-xs">
                {items.map((item) => (
                  <div key={item.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1C2521] truncate">{item.name}</p>
                      <p className="text-[#6B7570]">
                        Qty: {item.quantity} × <PriceTag amount={item.price} size="sm" className="inline-flex" />
                      </p>
                    </div>
                    <PriceTag amount={item.price * item.quantity} size="sm" />
                  </div>
                ))}
              </div>

              {/* Inline Coupon Input */}
              <div className="border-t border-[#E7ECE8] pt-4">
                <CouponInput
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                  appliedCode={appliedCoupon?.code || null}
                  discountText={appliedCoupon ? `-${formatPriceWithSymbol(appliedCoupon.discountAmount, settings.store_currency.symbol)}` : null}
                  disabled={isSubmitting}
                  placeholder="Enter coupon code"
                />
              </div>

              {/* Breakdown Totals */}
              <div className="border-t border-[#E7ECE8] pt-4 space-y-2.5 text-xs sm:text-sm text-[#6B7570]">
                <div className="flex justify-between">
                  <span>Total Weight:</span>
                  <span className="text-[#1C2521] font-normal">{totalWeightKg.toFixed(2)} kg</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <PriceTag amount={subtotal} size="sm" />
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-[#2F6B3C] font-medium">
                    <span>Discount ({appliedCoupon.code}):</span>
                    <span>-{formatPriceWithSymbol(appliedCoupon.discountAmount, settings.store_currency.symbol)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping Cost:</span>
                  <span className="text-[#1C2521] font-normal">
                    {isCalculatingShipping ? (
                      'Calculating...'
                    ) : !formData.countryId ? (
                      'Select country'
                    ) : (
                      <PriceTag amount={shippingCost} size="sm" />
                    )}
                  </span>
                </div>

                <div className="flex justify-between pt-3 border-t border-[#E7ECE8] text-base font-semibold text-[#1C2521]">
                  <span>Total Amount:</span>
                  <PriceTag amount={finalTotal} size="lg" />
                </div>
              </div>

              {/* Primary "Place Order" Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting || isCalculatingShipping || !formData.countryId}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Placing Order...
                  </span>
                ) : (
                  `Place Order • ${formatPriceWithSymbol(finalTotal, settings.store_currency.symbol)}`
                )}
              </Button>
            </div>
          </div>

        </div>
      </form>

      {/* Fill the Bracket Capacity Upsell Modal */}
      <CapacityUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        onContinueOrder={handleContinueOrderFromUpsell}
        countryId={formData.countryId}
        coveredCapacityGrams={shippingResult?.coveredCapacityGrams ?? 0}
        cartWeightGrams={totalWeightGrams}
      />

    </main>
  )
}
