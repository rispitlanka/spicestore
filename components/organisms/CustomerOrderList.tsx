'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/atoms/Badge'
import { PriceTag } from '@/components/atoms/PriceTag'
import { WeightTag } from '@/components/atoms/WeightTag'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { formatOrderId, getShortOrderId } from '@/lib/utils'

export interface CustomerOrderItem {
  id: string
  quantity: number
  unit_price: number
  unit_weight_kg: number
  product?: {
    id: string
    name: string
    slug: string
  } | null
}

export interface CustomerOrder {
  id: string
  order_number?: string | null
  created_at: string
  status: string
  total_amount: number
  display_currency_code?: string | null
  exchange_rate_used?: number | null
  total_amount_display?: number | null
  total_weight_kg: number
  payment_method: string
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  district?: string | null
  postal_code?: string | null
  country?: {
    id: string
    name: string
    code: string
  } | null
  order_items?: CustomerOrderItem[]
}

interface CustomerOrderListProps {
  orders: CustomerOrder[]
  title?: string
}

export function CustomerOrderList({ orders, title = 'Order History' }: CustomerOrderListProps) {
  const renderStatusBadge = (status: string) => {
    return <Badge>{status.toUpperCase()}</Badge>
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-[4px] border border-[#E7ECE8] p-8 text-center font-sans">
        <EmptyState
          title="No orders found"
          description="This customer has not placed any orders yet."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1C2521]">{title}</h2>
          <span className="text-xs text-[#6B7570]">
            {orders.length} order{orders.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Mobile Card View (< sm breakpoint) */}
      <div className="sm:hidden space-y-3">
        {orders.map((order) => {
          const totalItems = (order.order_items || []).reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
          )

          return (
            <div key={order.id} className="bg-white rounded-[4px] border border-[#E7ECE8] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-xs text-[#1C2521]">
                  <Link
                    href={`/admin/orders/${getShortOrderId(order.id)}`}
                    className="hover:text-[#2F6B3C] underline"
                  >
                    {formatOrderId(order.id, order.order_number)}
                  </Link>
                </span>
                {renderStatusBadge(order.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7570] border-t border-b border-[#E7ECE8] py-2">
                <div>
                  <span className="block text-[10px] text-[#6B7570]/70 uppercase">Date</span>
                  <span className="text-[#1C2521]">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] text-[#6B7570]/70 uppercase">Country</span>
                  <span className="text-[#1C2521]">{order.country ? order.country.name : 'N/A'}</span>
                </div>

                <div>
                  <span className="block text-[10px] text-[#6B7570]/70 uppercase">Items</span>
                  <span className="text-[#1C2521]">{totalItems > 0 ? `${totalItems} items` : '—'}</span>
                </div>

                <div>
                  <span className="block text-[10px] text-[#6B7570]/70 uppercase">Weight</span>
                  <WeightTag weightKg={order.total_weight_kg} size="sm" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <PriceTag amount={order.total_amount_display ?? order.total_amount} currency={order.display_currency_code || undefined} size="sm" />
                <Link href={`/admin/orders/${getShortOrderId(order.id)}`}>
                  <Button variant="secondary" size="sm" className="min-h-[44px] min-w-[44px] px-3">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop / Tablet Table View (>= sm breakpoint) */}
      <div className="hidden sm:block bg-white rounded-[4px] border border-[#E7ECE8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-[#E7ECE8] text-xs font-semibold text-[#1C2521]">
              <tr>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7ECE8]">
              {orders.map((order) => {
                const totalItems = (order.order_items || []).reduce(
                  (sum, item) => sum + (item.quantity || 0),
                  0
                )

                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#1C2521]">
                      <Link
                        href={`/admin/orders/${getShortOrderId(order.id)}`}
                        className="hover:text-[#2F6B3C] underline"
                      >
                        {formatOrderId(order.id, order.order_number)}
                      </Link>
                    </td>

                    <td className="py-3 px-4 text-xs text-[#6B7570] whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-[#1C2521]">
                      {order.country ? order.country.name : 'N/A'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-[#1C2521]">
                      {totalItems > 0 ? `${totalItems} item${totalItems === 1 ? '' : 's'}` : '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <WeightTag weightKg={order.total_weight_kg} size="sm" />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriceTag amount={order.total_amount_display ?? order.total_amount} currency={order.display_currency_code || undefined} size="sm" />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusBadge(order.status)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link href={`/admin/orders/${getShortOrderId(order.id)}`}>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
