'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { formatOrderId, getShortOrderId } from '@/lib/utils'

interface MetricTrendPoint {
  date: string
  revenue: number
}

interface DashboardMetrics {
  new_orders_today: number
  revenue_today: number
  pending_orders: number
  low_stock_count: number
  trend_7days: MetricTrendPoint[]
}

interface OrderRow {
  id: string
  order_number: string | null
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  district: string | null
  city: string | null
  subtotal: number
  shipping_cost: number
  total_amount: number
  status: string
  created_at: string
  customer_profiles?: {
    full_name: string | null
  } | null
}

interface LowStockItem {
  id: string
  sku: string | null
  stock: number
  attributes: Record<string, string> | null
  product_id: string
  products: {
    id: string
    name: string
    slug: string
    has_variations: boolean
  } | null
}

export default function AdminDashboardPage() {
  const { settings } = useSettings()
  const lowStockThreshold = settings.low_stock_threshold ?? 5

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    new_orders_today: 0,
    revenue_today: 0,
    pending_orders: 0,
    low_stock_count: 0,
    trend_7days: [],
  })
  const [pendingOrders, setPendingOrders] = useState<OrderRow[]>([])
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<MetricTrendPoint | null>(null)

  const fetchFallbackMetrics = useCallback(async (supabase: any, threshold: number) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    const [todayOrdersRes, todayRevenueRes, pendingRes, lowStockRes, last7DaysOrdersRes] =
      await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', todayIso),

        supabase
          .from('orders')
          .select('total_amount')
          .neq('status', 'cancelled')
          .gte('created_at', todayIso),

        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'confirmed']),

        supabase
          .from('product_variations')
          .select('id', { count: 'exact', head: true })
          .lte('stock', threshold),

        supabase
          .from('orders')
          .select('created_at, total_amount')
          .neq('status', 'cancelled')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ])

    const revenueToday = (todayRevenueRes.data || []).reduce(
      (sum: number, o: { total_amount: number }) => sum + Number(o.total_amount || 0),
      0
    )

    // Build 7-day trend map
    const trendMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      trendMap[dateStr] = 0
    }

    ;(last7DaysOrdersRes.data || []).forEach((o: { created_at: string; total_amount: number }) => {
      const dateStr = o.created_at.split('T')[0]
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr] += Number(o.total_amount || 0)
      }
    })

    const trend_7days = Object.entries(trendMap).map(([date, revenue]) => ({
      date,
      revenue,
    }))

    setMetrics({
      new_orders_today: todayOrdersRes.count || 0,
      revenue_today: revenueToday,
      pending_orders: pendingRes.count || 0,
      low_stock_count: lowStockRes.count || 0,
      trend_7days,
    })
  }, [])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient() as any

    try {
      // 1. Fetch aggregate metrics via RPC with fallback
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_admin_dashboard_metrics', {
        p_low_stock_threshold: lowStockThreshold,
      })

      if (!rpcErr && rpcData) {
        setMetrics({
          new_orders_today: rpcData.new_orders_today ?? 0,
          revenue_today: Number(rpcData.revenue_today ?? 0),
          pending_orders: rpcData.pending_orders ?? 0,
          low_stock_count: rpcData.low_stock_count ?? 0,
          trend_7days: Array.isArray(rpcData.trend_7days) ? rpcData.trend_7days : [],
        })
      } else {
        // Fallback queries if RPC function is not yet present on remote DB
        console.warn('RPC function error or missing, executing targeted fallback queries:', rpcErr)
        await fetchFallbackMetrics(supabase, lowStockThreshold)
      }

      // 2. Fetch Needs Attention Orders (pending, limit 10)
      const { data: pendingData } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_id, guest_name, guest_email, district, city,
          total_amount, status, created_at,
          customer_profiles(full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)

      setPendingOrders((pendingData as OrderRow[]) || [])

      // 3. Fetch Recent Orders (all statuses, limit 10)
      const { data: recentData } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_id, guest_name, guest_email, district, city,
          total_amount, status, created_at,
          customer_profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentOrders((recentData as OrderRow[]) || [])

      // 4. Fetch Low Stock Items (stock <= threshold)
      const { data: lowStockData } = await supabase
        .from('product_variations')
        .select(`
          id, sku, stock, attributes, product_id,
          products(id, name, slug, has_variations)
        `)
        .lte('stock', lowStockThreshold)
        .order('stock', { ascending: true })
        .limit(20)

      setLowStockItems((lowStockData as unknown as LowStockItem[]) || [])
    } catch (err: unknown) {
      console.error('Error fetching admin dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [fetchFallbackMetrics, lowStockThreshold])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Helper for customer display name
  const getCustomerName = (order: OrderRow) => {
    if (order.customer_profiles?.full_name?.trim()) {
      return order.customer_profiles.full_name.trim()
    }
    if (order.guest_name?.trim()) {
      return order.guest_name.trim()
    }
    if (order.guest_email?.trim()) {
      return order.guest_email.trim()
    }
    return 'Guest'
  }

  // Format variation label
  const getVariationLabel = (item: LowStockItem) => {
    const parentName = item.products?.name || 'Product'
    if (!item.products?.has_variations) {
      return parentName
    }
    const attrs = item.attributes ? Object.values(item.attributes).join(' / ') : ''
    return attrs ? `${parentName} (${attrs})` : `${parentName} (${item.sku || 'Variation'})`
  }

  // Calculate SVG dimensions and coordinates for 7-day revenue trend chart
  const renderTrendChart = () => {
    const trend = metrics.trend_7days
    if (!trend || trend.length === 0) {
      return (
        <div className="py-12 text-center text-xs text-[#6B7570]">
          No revenue trend data available.
        </div>
      )
    }

    const svgWidth = 640
    const svgHeight = 160
    const paddingX = 40
    const paddingY = 30
    const chartWidth = svgWidth - paddingX * 2
    const chartHeight = svgHeight - paddingY * 2

    const maxRevenue = Math.max(...trend.map((t) => Number(t.revenue)), 10)

    const points = trend.map((t, idx) => {
      const x = paddingX + (idx / Math.max(trend.length - 1, 1)) * chartWidth
      const y = svgHeight - paddingY - (Number(t.revenue) / maxRevenue) * chartHeight
      return { x, y, data: t }
    })

    const pathD = points.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    )

    return (
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[500px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            {/* Horizontal baseline */}
            <line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke="#E7ECE8"
              strokeWidth="1"
            />

            {/* Single green line */}
            <path
              d={pathD}
              fill="none"
              stroke="#2F6B3C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points */}
            {points.map((pt, idx) => {
              const isHovered = hoveredPoint?.date === pt.data.date
              const dateObj = new Date(pt.data.date + 'T00:00:00')
              const shortDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })

              return (
                <g key={idx} className="cursor-pointer">
                  {/* Outer hover target area */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="transparent"
                    onMouseEnter={() => setHoveredPoint(pt.data)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />

                  {/* Point Marker */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? '5' : '3.5'}
                    fill="#2F6B3C"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />

                  {/* X Axis Label */}
                  <text
                    x={pt.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-[#6B7570] font-sans"
                  >
                    {shortDate}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Minimal Tooltip Overlay */}
          {hoveredPoint && (
            <div className="mt-2 text-center text-xs text-[#1C2521] font-medium bg-[#F4F6F4] border border-[#E7ECE8] py-1 px-3 rounded-sm inline-block mx-auto">
              <span className="text-[#6B7570]">
                {new Date(hoveredPoint.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                :{' '}
              </span>
              <span className="font-semibold text-[#2F6B3C]">
                {formatPriceWithSymbol(hoveredPoint.revenue, settings.store_currency.symbol)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-[#1C2521]">
      {/* Top Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-xs text-[#6B7570] font-normal">
            Store overview, pending order fulfillment, inventory alerts, and revenue trends.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchDashboardData} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-sm text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* 1. Top row — key numbers (4 across desktop / 2x2 mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Box 1: New orders today */}
        <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-5 bg-white space-y-1">
          <div className="text-xs text-[#6B7570] font-normal">New Orders Today</div>
          <div className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight">
            {metrics.new_orders_today}
          </div>
          <div className="text-[11px] text-[#6B7570]">Status: Pending</div>
        </div>

        {/* Stat Box 2: Revenue today */}
        <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-5 bg-white space-y-1">
          <div className="text-xs text-[#6B7570] font-normal">Revenue Today</div>
          <PriceTag amount={metrics.revenue_today} size="lg" />
          <div className="text-[11px] text-[#6B7570]">Non-cancelled orders</div>
        </div>

        {/* Stat Box 3: Pending orders */}
        <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-5 bg-white space-y-1">
          <div className="text-xs text-[#6B7570] font-normal">Pending Orders</div>
          <div className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight">
            {metrics.pending_orders}
          </div>
          <div className="text-[11px] text-[#6B7570]">Needs fulfillment action</div>
        </div>

        {/* Stat Box 4: Low stock items */}
        <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-5 bg-white space-y-1">
          <div className="text-xs text-[#6B7570] font-normal">Low Stock Items</div>
          <div className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight">
            {metrics.low_stock_count}
          </div>
          <div className="text-[11px] text-[#6B7570]">Stock threshold ≤ {lowStockThreshold}</div>
        </div>
      </div>

      {/* 2. Simple 7-day revenue trend */}
      <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1C2521]">7-Day Revenue Trend</h2>
            <p className="text-xs text-[#6B7570]">Daily sales performance over the past 7 days</p>
          </div>
          <div className="text-xs font-medium text-[#2F6B3C] border border-[#2F6B3C]/20 px-2 py-0.5 rounded-sm bg-[#2F6B3C]/5">
            Single Green Line
          </div>
        </div>

        {renderTrendChart()}
      </div>

      {/* 3. Needs Attention section */}
      <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1C2521]">Needs Attention</h2>
            <p className="text-xs text-[#6B7570]">Unfulfilled orders with status = pending</p>
          </div>
          <Link
            href="/admin/orders?status=pending"
            className="text-xs text-[#2F6B3C] font-semibold hover:underline"
          >
            View all pending ({metrics.pending_orders}) →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#6B7570]">Loading pending orders...</div>
        ) : pendingOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7570]">
            No pending orders requiring attention right now. All caught up!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b border-[#E7ECE8] text-[#6B7570] font-normal">
                <tr>
                  <th className="p-3 font-normal">Order Ref</th>
                  <th className="p-3 font-normal">Date</th>
                  <th className="p-3 font-normal">Customer</th>
                  <th className="p-3 font-normal">District / Region</th>
                  <th className="p-3 font-normal">Total</th>
                  <th className="p-3 font-normal">Status</th>
                  <th className="p-3 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7ECE8]">
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F4F6F4]/60 transition-colors">
                    <td className="p-3 font-mono font-medium text-[#1C2521]">
                      {formatOrderId(order.id, order.order_number)}
                    </td>
                    <td className="p-3 text-[#6B7570]">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-3 text-[#1C2521] font-medium">{getCustomerName(order)}</td>
                    <td className="p-3 text-[#6B7570]">{order.district || '—'}</td>
                    <td className="p-3">
                      <PriceTag amount={Number(order.total_amount)} size="sm" />
                    </td>
                    <td className="p-3">
                      <span className="text-[#6B7570] uppercase font-normal tracking-wider">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/orders/${getShortOrderId(order.id)}`}
                        className="text-[#2F6B3C] font-semibold hover:underline"
                      >
                        Process Order →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Recent Orders */}
      <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1C2521]">Recent Orders</h2>
            <p className="text-xs text-[#6B7570]">Latest 10 orders across all statuses</p>
          </div>
          <Link href="/admin/orders" className="text-xs text-[#2F6B3C] font-semibold hover:underline">
            View full order list →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#6B7570]">Loading recent orders...</div>
        ) : recentOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7570]">No recent orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b border-[#E7ECE8] text-[#6B7570] font-normal">
                <tr>
                  <th className="p-3 font-normal">Order Ref</th>
                  <th className="p-3 font-normal">Date</th>
                  <th className="p-3 font-normal">Customer</th>
                  <th className="p-3 font-normal">Total</th>
                  <th className="p-3 font-normal">Status</th>
                  <th className="p-3 font-normal text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7ECE8]">
                {recentOrders.map((order) => {
                  const isDelivered = order.status.toLowerCase() === 'delivered'
                  return (
                    <tr key={order.id} className="hover:bg-[#F4F6F4]/60 transition-colors">
                      <td className="p-3 font-mono font-medium text-[#1C2521]">
                        {formatOrderId(order.id, order.order_number)}
                      </td>
                      <td className="p-3 text-[#6B7570]">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-[#1C2521] font-medium">{getCustomerName(order)}</td>
                      <td className="p-3 font-semibold text-[#2F6B3C]">
                        <PriceTag amount={Number(order.total_amount)} size="sm" />
                      </td>
                      <td className="p-3">
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
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/orders/${getShortOrderId(order.id)}`}
                          className="text-[#2F6B3C] font-medium hover:underline"
                        >
                          View →
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

      {/* 5. Low stock alert list — only shown if at least one item below threshold */}
      {lowStockItems.length > 0 && (
        <div className="border border-[#E7ECE8] rounded-sm p-4 sm:p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#1C2521]">Low Stock Alert List</h2>
              <p className="text-xs text-[#6B7570]">
                Product items with remaining stock ≤ {lowStockThreshold} units
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-sm">
              {lowStockItems.length} Low Stock Item{lowStockItems.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="border-b border-[#E7ECE8] text-[#6B7570] font-normal">
                <tr>
                  <th className="p-3 font-normal">Product / Variation</th>
                  <th className="p-3 font-normal">SKU</th>
                  <th className="p-3 font-normal">Current Stock</th>
                  <th className="p-3 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7ECE8]">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F4F6F4]/60 transition-colors">
                    <td className="p-3 font-medium text-[#1C2521]">{getVariationLabel(item)}</td>
                    <td className="p-3 font-mono text-[#6B7570]">{item.sku || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`font-semibold ${
                          item.stock === 0 ? 'text-red-600 font-bold' : 'text-amber-700'
                        }`}
                      >
                        {item.stock} unit{item.stock === 1 ? '' : 's'}
                        {item.stock === 0 ? ' (Out of Stock)' : ''}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {item.product_id ? (
                        <Link
                          href={
                            item.products?.has_variations
                              ? `/admin/products/${item.product_id}/variations`
                              : `/admin/products/${item.product_id}`
                          }
                          className="text-[#2F6B3C] font-semibold hover:underline"
                        >
                          Edit Item →
                        </Link>
                      ) : (
                        <span className="text-[#6B7570]">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
