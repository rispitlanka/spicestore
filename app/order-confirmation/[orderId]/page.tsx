'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PriceTag } from '@/components/atoms/PriceTag'
import { Badge } from '@/components/atoms/Badge'
import { Spinner } from '@/components/atoms/Spinner'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { Button } from '@/components/atoms/Button'
import { formatOrderId, fetchOrderByIdOrShortCode, formatAddress } from '@/lib/utils'

interface OrderDetails {
  id: string
  order_number?: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  address_line1: string
  address_line2?: string | null
  city: string
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

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const resolvedParams = use(params)
  const { orderId } = resolvedParams

  const { settings } = useSettings()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchOrder = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

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
          const msg = err instanceof Error ? err.message : 'Failed to load order confirmation details.'
          setError(msg)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    if (orderId) {
      fetchOrder()
    }

    return () => {
      isMounted = false
    }
  }, [orderId])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-16 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-[#6B7570]">
          <Spinner size="lg" /> Loading order confirmation...
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-16 px-4 max-w-2xl mx-auto text-center font-sans">
        <div className="bg-white rounded-[4px] border border-[#E7ECE8] p-8 space-y-4">
          <h1 className="text-xl font-semibold text-[#1C2521]">Order Not Found</h1>
          <p className="text-sm text-[#6B7570]">{error || 'We could not locate the requested order.'}</p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="primary" size="md">
                Return to Store
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      <div className="bg-white rounded-[4px] border border-[#E7ECE8] p-6 sm:p-8 mb-8 text-center space-y-3">
        <span className="text-xs font-semibold text-[#2F6B3C]">
          Order Placed Successfully
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C2521]">
          Thank you for your order
        </h1>
        <p className="text-sm text-[#6B7570]">
          Order Reference: <span className="font-mono font-medium text-[#1C2521]">{formatOrderId(order.id, order.order_number)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-[4px] border border-[#E7ECE8] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Items Ordered ({orderItems.length})
            </h2>

            <div className="divide-y divide-[#E7ECE8]">
              {orderItems.map((item) => {
                const hasAttributes =
                  item.variation?.attributes &&
                  typeof item.variation.attributes === 'object' &&
                  Object.keys(item.variation.attributes).length > 0

                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between text-sm gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#1C2521]">
                        {item.product?.name || 'Product'}
                      </p>
                      
                      {hasAttributes && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {Object.entries(item.variation!.attributes!).map(([key, val]) => (
                            <span
                              key={key}
                              className="text-xs text-[#6B7570]"
                            >
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-[#6B7570] flex items-center gap-1">
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

          <div className="bg-white rounded-[4px] border border-[#E7ECE8] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-[#1C2521] block mb-1">Customer</span>
                <p className="font-medium text-[#1C2521]">{order.guest_name || 'N/A'}</p>
                {order.guest_email && <p className="text-xs text-[#6B7570]">{order.guest_email}</p>}
                {order.guest_phone && <p className="text-xs text-[#6B7570]">{order.guest_phone}</p>}
              </div>

              <div>
                <span className="text-xs font-semibold text-[#1C2521] block mb-1">Delivery Address</span>
                <p className="text-[#1C2521] whitespace-pre-line leading-relaxed">{formatAddress(order)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[4px] border border-[#E7ECE8] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Payment Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-[#6B7570]">
                <span>Status</span>
                <Badge>{order.status.toUpperCase()}</Badge>
              </div>

              <div className="flex justify-between items-center text-[#6B7570]">
                <span>Payment Method</span>
                <span className="font-medium text-[#1C2521]">{order.payment_method}</span>
              </div>

              <div className="flex justify-between items-center text-[#6B7570] pt-2 border-t border-[#E7ECE8]">
                <span>Subtotal</span>
                <PriceTag
                  amount={order.exchange_rate_used ? order.subtotal * order.exchange_rate_used : order.subtotal}
                  currency={order.display_currency_code || undefined}
                  size="sm"
                />
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between items-center text-[#2F6B3C] font-medium">
                  <span>Discount</span>
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

              <div className="flex justify-between items-center text-[#6B7570]">
                <span>Shipping Cost</span>
                <PriceTag
                  amount={order.exchange_rate_used ? order.shipping_cost * order.exchange_rate_used : order.shipping_cost}
                  currency={order.display_currency_code || undefined}
                  size="sm"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E7ECE8] font-semibold text-base text-[#1C2521]">
                <span>Total Amount</span>
                <PriceTag
                  amount={order.total_amount_display ?? order.total_amount}
                  currency={order.display_currency_code || undefined}
                  size="md"
                />
              </div>
            </div>
          </div>

          <Link href="/" className="block">
            <Button variant="primary" size="lg" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
