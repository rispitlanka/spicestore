'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { PriceTag } from '@/components/atoms/PriceTag'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { formatOrderId, getShortOrderId } from '@/lib/utils'
import { SRI_LANKA_DISTRICTS } from '@/lib/constants/districts'

interface Country {
  id: string
  name: string
  code: string
}

interface OrderRow {
  id: string
  order_number: string | null
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  address_line1: string
  address_line2: string | null
  city: string
  district: string | null
  postal_code: string | null
  country_id: string
  subtotal: number
  subtotal_base?: number | null
  discount_amount: number
  total_weight_kg: number
  shipping_cost: number
  shipping_cost_base?: number | null
  total_amount: number
  total_amount_base?: number | null
  display_currency_code?: string | null
  exchange_rate_used?: number | null
  total_amount_display?: number | null
  payment_method: string
  status: string
  created_at: string
  country?: {
    id: string
    name: string
    code: string
  } | null
  customer_profiles?: {
    full_name: string | null
    phone: string | null
  } | null
  order_items?: Array<{
    id: string
    quantity: number
  }>
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')

  const fetchOrdersAndCountries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()

      const { data: countriesData } = await supabase
        .from('countries')
        .select('id, name, code')
        .order('name')

      if (countriesData) {
        setCountries(countriesData)
      }

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          *,
          country:countries(id, name, code),
          customer_profiles(full_name, phone),
          order_items(id, quantity)
        `)
        .order('created_at', { ascending: false })

      if (ordersErr) {
        throw ordersErr
      }

      setOrders((ordersData as unknown as OrderRow[]) || [])
    } catch (err: unknown) {
      console.error('Error loading admin orders:', err)
      const msg = err instanceof Error ? err.message : 'Failed to fetch orders.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrdersAndCountries()
  }, [])

  // Extract unique districts present in order dataset plus LK defaults
  const availableDistrictOptions = useMemo(() => {
    const set = new Set<string>()
    // Add standard Sri Lanka districts
    SRI_LANKA_DISTRICTS.forEach((d) => set.add(d))
    // Add any non-null districts from actual orders
    orders.forEach((o) => {
      if (o.district && o.district.trim()) {
        set.add(o.district.trim())
      }
    })

    const sorted = Array.from(set).sort()
    return [
      { value: 'all', label: 'All Districts / States' },
      ...sorted.map((d) => ({ value: d, label: d })),
    ]
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      if (countryFilter !== 'all' && order.country_id !== countryFilter) {
        return false
      }

      if (districtFilter !== 'all') {
        const orderDistrict = order.district?.toLowerCase().trim() || ''
        if (orderDistrict !== districtFilter.toLowerCase().trim()) {
          return false
        }
      }

      if (dateFilter !== 'all') {
        const orderDate = new Date(order.created_at)
        const now = new Date()
        if (dateFilter === 'today') {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          if (!isToday) return false
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (orderDate < sevenDaysAgo) return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const customerName = order.customer_profiles?.full_name?.toLowerCase() || ''
        const guestName = order.guest_name?.toLowerCase() || ''
        const guestEmail = order.guest_email?.toLowerCase() || ''
        const orderId = order.id.toLowerCase()
        const district = order.district?.toLowerCase() || ''
        const city = order.city?.toLowerCase() || ''
        const addressLine1 = order.address_line1?.toLowerCase() || ''

        const matchesSearch =
          customerName.includes(q) ||
          guestName.includes(q) ||
          guestEmail.includes(q) ||
          orderId.includes(q) ||
          district.includes(q) ||
          city.includes(q) ||
          addressLine1.includes(q)

        if (!matchesSearch) return false
      }

      return true
    })
  }, [orders, statusFilter, countryFilter, districtFilter, dateFilter, searchQuery])

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-[#1C2521]">
      {/* Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Orders ({orders.length})
          </h1>
          <p className="mt-1 text-xs text-[#6B7570] font-normal">
            Manage customer orders, filter local deliveries by district, and update fulfillment status.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchOrdersAndCountries}
        >
          Refresh
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="border border-[#E7ECE8] rounded-sm p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Input
          placeholder="Search customer, address, district..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          options={availableDistrictOptions}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />

        <Select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Countries' },
            ...countries.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />

        <Select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Dates' },
            { value: 'today', label: 'Today' },
            { value: '7days', label: 'Last 7 Days' },
          ]}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="border border-[#E7ECE8] rounded-sm p-12 text-center text-xs text-[#6B7570]">
          Loading orders...
        </div>
      ) : error ? (
        <div className="border border-[#E7ECE8] rounded-sm p-4 bg-white text-xs text-[#1C2521]">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-[#E7ECE8] rounded-sm p-12 text-center">
          <EmptyState
            title="No orders found"
            description="No customer orders match your current filter options."
          />
        </div>
      ) : (
        <div className="border border-[#E7ECE8] rounded-sm bg-white overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-white border-b border-[#E7ECE8] text-[#6B7570] font-normal">
              <tr>
                <th className="p-3 sm:p-4 font-normal">Order Ref</th>
                <th className="p-3 sm:p-4 font-normal">Date</th>
                <th className="p-3 sm:p-4 font-normal">Customer</th>
                <th className="p-3 sm:p-4 font-normal">District / Region</th>
                <th className="p-3 sm:p-4 font-normal">Total</th>
                <th className="p-3 sm:p-4 font-normal">Status</th>
                <th className="p-3 sm:p-4 font-normal text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7ECE8]">
              {filteredOrders.map((order) => {
                const isDelivered = order.status.toLowerCase() === 'delivered'
                const customerName = order.customer_profiles?.full_name || order.guest_name || 'Guest Customer'

                return (
                  <tr key={order.id} className="hover:bg-[#F4F6F4]/50 transition-colors">
                    <td className="p-3 sm:p-4 font-mono font-medium text-[#1C2521]">
                      {formatOrderId(order.id, order.order_number)}
                    </td>

                    <td className="p-3 sm:p-4 text-[#6B7570]">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="p-3 sm:p-4 text-[#1C2521]">
                      {customerName}
                    </td>

                    <td className="p-3 sm:p-4 text-[#1C2521] font-medium">
                      {order.district || '—'}
                    </td>

                    <td className="p-3 sm:p-4 font-semibold text-[#2F6B3C]">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1">
                          <PriceTag amount={order.total_amount_base ?? order.total_amount} currency="USD" size="sm" />
                          <span className="text-[10px] text-[#6B7570] font-normal uppercase">USD</span>
                        </span>
                        {order.display_currency_code && order.display_currency_code !== 'USD' && (
                          <span className="text-[11px] text-[#6B7570] font-normal flex items-center gap-1">
                            <span>Collect:</span>
                            <PriceTag
                              amount={order.total_amount_display ?? order.total_amount}
                              currency={order.display_currency_code}
                              size="sm"
                              className="text-[#1C2521] font-medium"
                            />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 sm:p-4">
                      {/* Single green accent for positive/active states only */}
                      <span
                        className={
                          isDelivered
                            ? 'text-[#2F6B3C] font-semibold uppercase tracking-wider'
                            : 'text-[#6B7570] font-normal uppercase tracking-wider'
                        }
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-3 sm:p-4 text-right">
                      <Link
                        href={`/admin/orders/${getShortOrderId(order.id)}`}
                        className="text-[#2F6B3C] hover:underline font-medium min-h-[44px] inline-flex items-center justify-end"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
