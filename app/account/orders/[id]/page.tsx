'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { formatOrderId, getShortOrderId, fetchOrderByIdOrShortCode, formatAddress } from '@/lib/utils'

interface OrderDetails {
  id: string
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  district?: string | null
  postal_code?: string | null
  subtotal: number
  discount_amount: number
  total_weight_kg: number
  shipping_cost: number
  total_amount: number
  display_currency_code?: string | null
  exchange_rate_used?: number | null
  total_amount_display?: number | null
  payment_method: string
  status: string
  created_at: string
  country?: {
    name: string
    code: string
  } | null
  coupon?: {
    code: string
    type: 'percent' | 'fixed'
    value: number
  } | null
}

interface OrderItemDetail {
  id: string
  quantity: number
  unit_price: number
  unit_weight_kg: number
  product?: {
    name: string
    slug: string
  } | null
  variation?: {
    id: string
    attributes: Record<string, string | number | boolean> | null
    sku: string | null
  } | null
}

export default function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const { id: orderId } = resolvedParams

  const { user, loading: authLoading } = useAuth()
  const { settings } = useSettings()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchOrder = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        const supabase = createClient()

        // Fetch Order Record by full UUID or short ID
        const { data: orderData, error: orderErr } = await fetchOrderByIdOrShortCode(
          supabase,
          orderId,
          '*, country:countries(name, code), coupon:coupons(code, type, value)'
        )

        if (orderErr || !orderData) {
          setError('Order not found or could not be loaded.')
          setIsLoading(false)
          return
        }

        // Security check: ensure order belongs to this customer
        if (orderData.customer_id && orderData.customer_id !== user.id) {
          setError('You do not have authorization to view this order.')
          setIsLoading(false)
          return
        }

        // Fetch Order Items
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            unit_price,
            unit_weight_kg,
            product:products(name, slug),
            variation:product_variations(id, attributes, sku)
          `)
          .eq('order_id', orderData.id)

        if (itemsErr) {
          console.error('Error fetching order items:', itemsErr)
        }

        if (isMounted) {
          setOrder(orderData as unknown as OrderDetails)
          setOrderItems((itemsData as unknown as OrderItemDetail[]) || [])
          setError(null)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load order details.'
          setError(msg)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    if (orderId && !authLoading) {
      fetchOrder()
    }

    return () => {
      isMounted = false
    }
  }, [orderId, user, authLoading])

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex items-center justify-center font-sans text-sm text-[#6B7570]">
        Loading order details...
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 max-w-md mx-auto font-sans text-center">
        <div className="border border-[#E7ECE8] rounded-sm p-8 space-y-4">
          <h1 className="text-xl font-normal text-[#1C2521]">Sign In Required</h1>
          <p className="text-xs text-[#6B7570]">Please sign in to view your order details.</p>
          <div className="pt-2">
            <Link href={`/account/login?redirect=/account/orders/${orderId}`}>
              <Button variant="primary" size="md">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 max-w-md mx-auto font-sans text-center">
        <div className="border border-[#E7ECE8] rounded-sm p-8 space-y-4">
          <h1 className="text-xl font-normal text-[#1C2521]">Order Not Found</h1>
          <p className="text-xs text-[#6B7570]">{error || 'We could not locate the requested order.'}</p>
          <div className="pt-2">
            <Link href="/account">
              <Button variant="primary" size="md">
                Back to Account & Orders
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const isDelivered = order.status.toLowerCase() === 'delivered'

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans space-y-8">
      {/* Top Header Nav & Order Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7ECE8] pb-4">
        <div>
          <Link
            href="/account"
            className="text-xs text-[#6B7570] hover:text-[#1C2521] underline transition-colors block mb-2"
          >
            ← Back to Account & Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
              Order {formatOrderId(order.id)}
            </h1>
            <span
              className={
                isDelivered
                  ? 'text-[#2F6B3C] font-semibold text-xs uppercase tracking-wider'
                  : 'text-[#6B7570] font-normal text-xs uppercase tracking-wider'
              }
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-[#6B7570] mt-1" suppressHydrationWarning>
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <Link href={`/order-confirmation/${getShortOrderId(order.id)}`}>
          <Button variant="secondary" size="sm">
            View Receipt
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Main Details */}
        <div className="md:col-span-7 space-y-6">
          {/* Order Items */}
          <div className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Items Ordered ({orderItems.length})
            </h2>

            <div className="divide-y divide-[#E7ECE8] text-xs">
              {orderItems.map((item) => {
                const attrText =
                  item.variation?.attributes && typeof item.variation.attributes === 'object'
                    ? Object.values(item.variation.attributes).filter(Boolean).join(' / ')
                    : null

                return (
                  <div key={item.id} className="py-3 first:pt-0 flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-medium text-[#1C2521]">
                        {item.product?.name || 'Product'}
                      </p>

                      {attrText && (
                        <p className="text-[#6B7570] font-normal">{attrText}</p>
                      )}

                      <p className="text-[#6B7570] flex items-center gap-1">
                        <span>Qty: {item.quantity} ×</span>
                        <PriceTag amount={item.unit_price} size="sm" className="inline-flex" />
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <PriceTag amount={item.quantity * item.unit_price} size="sm" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Delivery Info */}
          <div className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4 text-xs">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[#6B7570] block font-normal mb-1">Recipient</span>
                <p className="font-medium text-[#1C2521]">{order.guest_name || user.email}</p>
                {order.guest_email && <p className="text-[#6B7570]">{order.guest_email}</p>}
                {order.guest_phone && <p className="text-[#6B7570]">{order.guest_phone}</p>}
              </div>

              <div>
                <span className="text-[#6B7570] block font-normal mb-1">Shipping Address</span>
                <p className="text-[#1C2521] whitespace-pre-line leading-relaxed">{formatAddress(order)}</p>
                {order.country && (
                  <p className="text-[#6B7570] mt-1">
                    {order.country.name} ({order.country.code})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="md:col-span-5 space-y-6">
          <div className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4 text-xs sm:text-sm">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Payment & Summary
            </h2>

            <div className="space-y-2.5 text-[#6B7570]">
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <span className={isDelivered ? 'text-[#2F6B3C] font-semibold' : 'text-[#1C2521]'}>
                  {order.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Payment Method:</span>
                <span className="text-[#1C2521] font-normal">{order.payment_method}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E7ECE8]">
                <span>Total Weight:</span>
                <span className="text-[#1C2521]">{order.total_weight_kg.toFixed(2)} kg</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <PriceTag
                  amount={order.exchange_rate_used ? order.subtotal * order.exchange_rate_used : order.subtotal}
                  currency={order.display_currency_code || undefined}
                  size="sm"
                />
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between items-center text-[#2F6B3C] font-medium">
                  <span>Discount ({order.coupon?.code || 'Coupon'}):</span>
                  <span>
                    -<PriceTag
                      amount={order.exchange_rate_used ? order.discount_amount * order.exchange_rate_used : order.discount_amount}
                      currency={order.display_currency_code || undefined}
                      size="sm"
                      className="inline-flex"
                    />
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Shipping Cost:</span>
                <PriceTag
                  amount={order.exchange_rate_used ? order.shipping_cost * order.exchange_rate_used : order.shipping_cost}
                  currency={order.display_currency_code || undefined}
                  size="sm"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E7ECE8] font-semibold text-base text-[#1C2521]">
                <span>Total Amount:</span>
                <PriceTag
                  amount={order.total_amount_display ?? order.total_amount}
                  currency={order.display_currency_code || undefined}
                  size="lg"
                />
              </div>
            </div>
          </div>

          <Link href="/account" className="block">
            <Button variant="secondary" size="md" className="w-full">
              Return to Account
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}

