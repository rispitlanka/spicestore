'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Select } from '@/components/atoms/Select'
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
  subtotal_base?: number | null
  shipping_cost_base?: number | null
  total_amount_base?: number | null
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
  customer_profiles?: {
    full_name: string | null
    phone: string | null
    default_address_line1: string | null
    default_address_line2: string | null
    default_city: string | null
    default_district: string | null
    default_postal_code: string | null
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

const ALLOWED_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const { id: orderId } = resolvedParams

  const { settings } = useSettings()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('pending')

  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const fetchOrderDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const supabase = createClient() as any

        const { data: orderData, error: orderErr } = await fetchOrderByIdOrShortCode(
          supabase,
          orderId,
          '*, country:countries(name, code), coupon:coupons(code, type, value), customer_profiles(full_name, phone, default_address_line1, default_address_line2, default_city, default_district, default_postal_code)'
        )

        if (!active) return

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

        if (active) {
          setOrder(orderData as unknown as OrderDetails)
          setSelectedStatus(orderData.status || 'pending')
          setOrderItems((itemsData as unknown as OrderItemDetail[]) || [])
        }
      } catch (err: unknown) {
        if (active) {
          console.error('Error fetching order:', err)
          const msg = err instanceof Error ? err.message : 'Failed to fetch order details.'
          setError(msg)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    if (orderId) {
      fetchOrderDetails()
    }

    return () => {
      active = false
    }
  }, [orderId])

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return

    try {
      setIsUpdatingStatus(true)
      setStatusSuccess(null)
      setError(null)

      const supabase = createClient() as any
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)

      if (updateErr) {
        throw updateErr
      }

      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
      setSelectedStatus(newStatus)
      setStatusSuccess(`Order status updated to "${newStatus.toUpperCase()}" successfully!`)

      setTimeout(() => setStatusSuccess(null), 4000)
    } catch (err: unknown) {
      console.error('Error updating order status:', err)
      const msg = err instanceof Error ? err.message : 'Failed to update order status.'
      setError(msg)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex items-center justify-center font-sans text-sm text-[#6B7570]">
        Loading order details...
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
            <Link href="/admin/orders">
              <Button variant="primary" size="md">
                Back to Orders List
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const isDelivered = order.status.toLowerCase() === 'delivered'

  return (
    <div className="max-w-5xl mx-auto font-sans text-[#1C2521] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7ECE8] pb-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-xs text-[#6B7570] hover:text-[#1C2521] underline transition-colors block mb-2"
          >
            ← Back to Orders List
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
        </div>

        <Link href={`/order-confirmation/${getShortOrderId(order.id)}`} target="_blank">
          <Button variant="secondary" size="sm">
            View Receipt
          </Button>
        </Link>
      </div>

      {/* Success Notification */}
      {statusSuccess && (
        <div className="p-3 rounded-sm border border-[#E7ECE8] bg-white text-[#2F6B3C] text-xs font-normal">
          {statusSuccess}
        </div>
      )}

      {/* Status Control Box */}
      <div className="border border-[#E7ECE8] rounded-sm p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#1C2521]">Order Status</h2>
          <p className="text-xs text-[#6B7570]">
            Current status: <span className="font-medium text-[#1C2521] uppercase">{order.status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={ALLOWED_STATUSES}
              disabled={isUpdatingStatus}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => handleUpdateStatus(selectedStatus)}
            disabled={isUpdatingStatus || selectedStatus === order.status}
          >
            {isUpdatingStatus ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </div>

      {/* Main Order Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="md:col-span-7 space-y-6">
          {/* Order Items */}
          <div className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Order Items ({orderItems.length})
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
              Customer & Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[#6B7570] block font-normal mb-1">Customer</span>
                <p className="font-medium text-[#1C2521]">
                  {order.customer_profiles?.full_name || order.guest_name || 'Guest'}
                </p>
                {order.guest_email && <p className="text-[#6B7570]">{order.guest_email}</p>}
                {(order.guest_phone || order.customer_profiles?.phone) && (
                  <p className="text-[#6B7570]">{order.guest_phone || order.customer_profiles?.phone}</p>
                )}
              </div>

              <div>
                <span className="text-[#6B7570] block font-normal mb-1">Shipping Address</span>
                <p className="text-[#1C2521] whitespace-pre-line leading-relaxed">{formatAddress(order)}</p>
                {order.district && (
                  <p className="text-[#6B7570] mt-1">
                    District / Region: <span className="font-medium text-[#1C2521]">{order.district}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-5 space-y-6">
          <div className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4 text-xs sm:text-sm">
            <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
              Financial Breakdown
            </h2>

            <div className="space-y-2.5 text-[#6B7570]">
              <div className="flex justify-between items-center">
                <span>Payment Method:</span>
                <span className="text-[#1C2521] uppercase font-normal">{order.payment_method}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E7ECE8]">
                <span>Total Weight:</span>
                <span className="text-[#1C2521]">{order.total_weight_kg.toFixed(2)} kg</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Subtotal (Base USD):</span>
                <PriceTag amount={order.subtotal_base ?? order.subtotal} currency="USD" size="sm" />
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between items-center text-[#2F6B3C] font-medium">
                  <span>Discount:</span>
                  <span>
                    -<PriceTag amount={order.discount_amount} currency="USD" size="sm" className="inline-flex" />
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Shipping Cost (Base USD):</span>
                <PriceTag amount={order.shipping_cost_base ?? order.shipping_cost} currency="USD" size="sm" />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E7ECE8] font-semibold text-sm text-[#1C2521]">
                <span>Base Total (Bookkeeping):</span>
                <PriceTag amount={order.total_amount_base ?? order.total_amount} currency="USD" size="md" />
              </div>

              {order.display_currency_code && order.display_currency_code !== 'USD' && (
                <div className="mt-3 pt-3 border-t border-[#E7ECE8] space-y-2 bg-[#F4F6F4]/50 p-3 rounded-[4px]">
                  <div className="flex justify-between items-center text-xs text-[#6B7570]">
                    <span>Customer Currency:</span>
                    <span className="font-semibold text-[#1C2521] uppercase">{order.display_currency_code}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#6B7570]">
                    <span>Exchange Rate Locked:</span>
                    <span className="font-mono text-[#1C2521]">1 USD = {order.exchange_rate_used || 1.0} {order.display_currency_code}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#E7ECE8] font-semibold text-sm text-[#2F6B3C]">
                    <span>Customer Cash Collection Total:</span>
                    <PriceTag
                      amount={order.total_amount_display ?? order.total_amount}
                      currency={order.display_currency_code}
                      size="md"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

