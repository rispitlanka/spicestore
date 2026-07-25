'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Badge } from '@/components/atoms/Badge'
import { PriceTag } from '@/components/atoms/PriceTag'
import { EmptyState } from '@/components/atoms/EmptyState'

type Coupon = Tables<'coupons'>
type Category = Tables<'categories'>
type Product = Tables<'products'>

// Helper for formatting ISO date to datetime-local input value
function toDatetimeLocal(isoStr: string | null): string {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => (n < 10 ? '0' + n : n)
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

// Helper for formatting ISO date to readable string
function formatDate(isoStr: string | null): string {
  if (!isoStr) return 'No limit'
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return 'Invalid date'
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid date'
  }
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form Fields
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState<number | ''>('')
  const [minOrderValue, setMinOrderValue] = useState<number | ''>(0)
  const [usageLimit, setUsageLimit] = useState<number | ''>('')
  const [usageCount, setUsageCount] = useState<number>(0)
  const [perCustomerLimit, setPerCustomerLimit] = useState<number | ''>('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([])
  const [applicableCategoryIds, setApplicableCategoryIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  // Multi-select search helpers inside modal
  const [productSearch, setProductSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')

  const fetchCouponsAndMetadata = useCallback(async () => {
    setLoading(true)
    const supabase = createClient() as any

    const [couponsRes, catsRes, prodsRes] = await Promise.all([
      supabase.from('coupons').select('*').order('is_active', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
    ])

    if (couponsRes.error) {
      console.error('Error fetching coupons:', couponsRes.error)
      setErrorMessage('Failed to load coupons.')
    } else {
      setCoupons(couponsRes.data || [])
    }

    if (!catsRes.error) setCategories(catsRes.data || [])
    if (!prodsRes.error) setProducts(prodsRes.data || [])

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCouponsAndMetadata()
  }, [fetchCouponsAndMetadata])

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date()
    const isExhausted = coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit
    const isExpired = coupon.valid_until !== null && new Date(coupon.valid_until) < now
    const isScheduled = coupon.valid_from !== null && new Date(coupon.valid_from) > now

    if (isExhausted) return { label: 'Exhausted', variant: 'danger' as const }
    if (isExpired) return { label: 'Expired', variant: 'warning' as const }
    if (!coupon.is_active) return { label: 'Inactive', variant: 'secondary' as const }
    if (isScheduled) return { label: 'Scheduled', variant: 'outline' as const }
    return { label: 'Active', variant: 'success' as const }
  }

  const openCreateModal = () => {
    setEditingCoupon(null)
    setCode('')
    setType('percent')
    setValue('')
    setMinOrderValue(0)
    setUsageLimit('')
    setUsageCount(0)
    setPerCustomerLimit('')
    setValidFrom('')
    setValidUntil('')
    setApplicableProductIds([])
    setApplicableCategoryIds([])
    setIsActive(true)
    setProductSearch('')
    setCategorySearch('')
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setCode(coupon.code)
    setType(coupon.type)
    setValue(coupon.value)
    setMinOrderValue(coupon.min_order_value ?? 0)
    setUsageLimit(coupon.usage_limit ?? '')
    setUsageCount(coupon.usage_count)
    setPerCustomerLimit(coupon.per_customer_limit ?? '')
    setValidFrom(toDatetimeLocal(coupon.valid_from))
    setValidUntil(toDatetimeLocal(coupon.valid_until))
    setApplicableProductIds(coupon.applicable_product_ids || [])
    setApplicableCategoryIds(coupon.applicable_category_ids || [])
    setIsActive(coupon.is_active)
    setProductSearch('')
    setCategorySearch('')
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      setErrorMessage('Coupon code is required.')
      setSubmitting(false)
      return
    }

    const numValue = value === '' ? null : Number(value)
    if (numValue === null || isNaN(numValue) || numValue <= 0) {
      setErrorMessage('Please enter a valid positive discount value.')
      setSubmitting(false)
      return
    }

    if (type === 'percent' && numValue > 100) {
      setErrorMessage('Percentage discount cannot exceed 100%.')
      setSubmitting(false)
      return
    }

    const numMinOrder = minOrderValue === '' ? 0 : Number(minOrderValue)
    if (isNaN(numMinOrder) || numMinOrder < 0) {
      setErrorMessage('Minimum order value must be 0 or a positive number.')
      setSubmitting(false)
      return
    }

    const numUsageLimit = usageLimit === '' ? null : Number(usageLimit)
    if (numUsageLimit !== null && (isNaN(numUsageLimit) || numUsageLimit < 1)) {
      setErrorMessage('Usage limit must be a positive integer or empty for unlimited.')
      setSubmitting(false)
      return
    }

    const numPerCustLimit = perCustomerLimit === '' ? null : Number(perCustomerLimit)
    if (numPerCustLimit !== null && (isNaN(numPerCustLimit) || numPerCustLimit < 1)) {
      setErrorMessage('Per-customer limit must be a positive integer or empty for unlimited.')
      setSubmitting(false)
      return
    }

    const isoValidFrom = validFrom ? new Date(validFrom).toISOString() : null
    const isoValidUntil = validUntil ? new Date(validUntil).toISOString() : null

    if (isoValidFrom && isoValidUntil && new Date(isoValidFrom) >= new Date(isoValidUntil)) {
      setErrorMessage('Valid-until date must be after valid-from date.')
      setSubmitting(false)
      return
    }

    const supabase = createClient() as any

    try {
      const payload = {
        code: cleanCode,
        type,
        value: numValue,
        min_order_value: numMinOrder,
        usage_limit: numUsageLimit,
        per_customer_limit: numPerCustLimit,
        applicable_product_ids: applicableProductIds.length > 0 ? applicableProductIds : null,
        applicable_category_ids: applicableCategoryIds.length > 0 ? applicableCategoryIds : null,
        valid_from: isoValidFrom,
        valid_until: isoValidUntil,
        is_active: isActive,
      }

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingCoupon.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('coupons').insert({
          ...payload,
          usage_count: 0,
        })

        if (error) throw error
      }

      setIsModalOpen(false)
      fetchCouponsAndMetadata()
    } catch (err: unknown) {
      console.error('Error saving coupon:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save coupon code.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    const supabase = createClient() as any
    const newStatus = !coupon.is_active
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: newStatus })
      .eq('id', coupon.id)

    if (!error) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: newStatus } : c))
      )
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    setSubmitting(true)
    const supabase = createClient() as any
    const { error } = await supabase.from('coupons').delete().eq('id', id)

    if (error) {
      alert(`Cannot delete coupon: ${error.message}`)
    } else {
      setDeletingCoupon(null)
      fetchCouponsAndMetadata()
    }
    setSubmitting(false)
  }

  const toggleProductSelect = (id: string) => {
    setApplicableProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const toggleCategorySelect = (id: string) => {
    setApplicableCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  // Filtered coupons
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase())
    const statusInfo = getCouponStatus(c)

    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && statusInfo.label.toLowerCase() === statusFilter.toLowerCase()
  })

  const filteredModalProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const filteredModalCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Coupons Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create discount codes, set usage limits, date validity ranges, and product/category restrictions.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openCreateModal} className="font-semibold shrink-0">
          + Add Coupon Code
        </Button>
      </div>

      {/* Search & Status Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by code (e.g. SUMMER20)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-52">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Scheduled', value: 'scheduled' },
                { label: 'Expired', value: 'expired' },
                { label: 'Exhausted', value: 'exhausted' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-muted">
          Showing {filteredCoupons.length} of {coupons.length} coupons
        </div>
      </div>

      {/* Coupons Table */}
      {loading ? (
        <div className="py-12 text-center text-muted font-medium animate-pulse">
          Loading coupons...
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8">
          <EmptyState
            title="No Coupons Found"
            description="Create your first discount coupon code to boost promotions."
          />
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-hover/60 border-b border-border text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Discount</th>
                  <th className="px-6 py-4">Min Order</th>
                  <th className="px-6 py-4">Usage / Limit</th>
                  <th className="px-6 py-4">Validity Range</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCoupons.map((coupon) => {
                  const statusInfo = getCouponStatus(coupon)
                  const productCount = coupon.applicable_product_ids?.length || 0
                  const categoryCount = coupon.applicable_category_ids?.length || 0

                  return (
                    <tr key={coupon.id} className="hover:bg-surface-hover/30 transition-colors">
                      {/* Code */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-foreground tracking-wider font-mono bg-accent/10 text-accent px-2.5 py-1 rounded-md inline-block border border-accent/20">
                          {coupon.code}
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="px-6 py-4 font-bold text-foreground">
                        {coupon.type === 'percent' ? (
                          <span className="text-emerald-700 font-extrabold">{coupon.value}% OFF</span>
                        ) : (
                          <PriceTag amount={coupon.value} size="sm" />
                        )}
                      </td>

                      {/* Min Order Value */}
                      <td className="px-6 py-4 font-medium text-foreground">
                        {coupon.min_order_value > 0 ? (
                          <PriceTag amount={coupon.min_order_value} size="sm" />
                        ) : (
                          <span className="text-xs text-muted">No min</span>
                        )}
                      </td>

                      {/* Usage & Limits */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs font-medium">
                          <span className="font-bold text-foreground">
                            {coupon.usage_count} / {coupon.usage_limit ?? '∞'} uses
                          </span>
                          {coupon.per_customer_limit ? (
                            <span className="text-muted text-[11px]">
                              Limit: {coupon.per_customer_limit} / customer
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Validity Range */}
                      <td className="px-6 py-4 text-xs font-medium text-foreground">
                        {coupon.valid_from || coupon.valid_until ? (
                          <div className="space-y-0.5">
                            <div>From: {formatDate(coupon.valid_from)}</div>
                            <div>Until: {formatDate(coupon.valid_until)}</div>
                          </div>
                        ) : (
                          <span className="text-muted">No expiry</span>
                        )}
                      </td>

                      {/* Scope */}
                      <td className="px-6 py-4 text-xs font-medium">
                        {productCount === 0 && categoryCount === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-hover text-muted border border-border">
                            All Store Items
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {categoryCount > 0 && (
                              <div className="text-[11px] font-semibold text-accent">
                                {categoryCount} Categor{categoryCount === 1 ? 'y' : 'ies'}
                              </div>
                            )}
                            {productCount > 0 && (
                              <div className="text-[11px] font-semibold text-foreground">
                                {productCount} Product{productCount === 1 ? '' : 's'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(coupon)}
                          className="cursor-pointer"
                          title="Click to toggle Active status"
                        >
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(coupon)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingCoupon(coupon)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl p-6 sm:p-8 space-y-6 my-8 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon'}
                </h2>
                {editingCoupon && (
                  <span className="text-xs font-bold bg-surface-hover text-muted px-2.5 py-1 rounded-full border border-border">
                    {usageCount} Used
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              {/* Code, Type, Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Coupon Code"
                  required
                  placeholder="e.g. WELCOME10"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={submitting}
                />

                <Select
                  label="Discount Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
                  options={[
                    { label: 'Percentage (%)', value: 'percent' },
                    { label: 'Fixed Amount ($)', value: 'fixed' },
                  ]}
                  disabled={submitting}
                />

                <Input
                  label={type === 'percent' ? 'Discount Percent (%)' : 'Discount Amount ($)'}
                  type="number"
                  step={type === 'percent' ? '1' : '0.01'}
                  min="0.01"
                  required
                  placeholder={type === 'percent' ? '15' : '5.00'}
                  value={value}
                  onChange={(e) =>
                    setValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  disabled={submitting}
                />
              </div>

              {/* Min Order & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-4">
                <Input
                  label="Min Order Value ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={minOrderValue}
                  onChange={(e) =>
                    setMinOrderValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  disabled={submitting}
                />

                <Input
                  label="Total Usage Limit"
                  type="number"
                  min="1"
                  placeholder="Leave empty = Unlimited"
                  value={usageLimit}
                  onChange={(e) =>
                    setUsageLimit(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  disabled={submitting}
                />

                <Input
                  label="Per-Customer Limit"
                  type="number"
                  min="1"
                  placeholder="Leave empty = Unlimited"
                  value={perCustomerLimit}
                  onChange={(e) =>
                    setPerCustomerLimit(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  disabled={submitting}
                />
              </div>

              {/* Validity Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Valid From (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-foreground"
                  />
                </div>
              </div>

              {/* Restrictions Multi-Select Section */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                  Applicability Restrictions (Leave empty = Applies to everything)
                </div>

                {/* Applicable Categories */}
                <div className="space-y-2 bg-surface-hover/30 p-3.5 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Restrict to Categories ({applicableCategoryIds.length} selected)
                    </label>
                    {applicableCategoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setApplicableCategoryIds([])}
                        className="text-[11px] text-accent font-semibold hover:underline cursor-pointer"
                      >
                        Clear Category Selection
                      </button>
                    )}
                  </div>

                  <Input
                    placeholder="Filter categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    disabled={submitting}
                  />

                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 pt-1">
                    {filteredModalCategories.length === 0 ? (
                      <div className="text-xs text-muted p-2">No matching categories.</div>
                    ) : (
                      filteredModalCategories.map((cat) => {
                        const isSelected = applicableCategoryIds.includes(cat.id)
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                              isSelected
                                ? 'bg-accent/10 border-accent/40 font-bold text-foreground'
                                : 'bg-surface border-border hover:bg-surface-hover text-muted'
                            }`}
                          >
                            <span>{cat.name}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCategorySelect(cat.id)}
                              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                              disabled={submitting}
                            />
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Applicable Products */}
                <div className="space-y-2 bg-surface-hover/30 p-3.5 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Restrict to Specific Products ({applicableProductIds.length} selected)
                    </label>
                    {applicableProductIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setApplicableProductIds([])}
                        className="text-[11px] text-accent font-semibold hover:underline cursor-pointer"
                      >
                        Clear Product Selection
                      </button>
                    )}
                  </div>

                  <Input
                    placeholder="Filter products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    disabled={submitting}
                  />

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 pt-1">
                    {filteredModalProducts.length === 0 ? (
                      <div className="text-xs text-muted p-2">No matching products.</div>
                    ) : (
                      filteredModalProducts.map((prod) => {
                        const isSelected = applicableProductIds.includes(prod.id)
                        return (
                          <label
                            key={prod.id}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                              isSelected
                                ? 'bg-accent/10 border-accent/40 font-bold text-foreground'
                                : 'bg-surface border-border hover:bg-surface-hover text-muted'
                            }`}
                          >
                            <span>{prod.name}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProductSelect(prod.id)}
                              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                              disabled={submitting}
                            />
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <input
                  type="checkbox"
                  id="couponActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  disabled={submitting}
                />
                <label htmlFor="couponActiveToggle" className="text-sm font-semibold text-foreground">
                  Active (enabled for public cart redemptions)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="font-semibold"
                  isLoading={submitting}
                  disabled={submitting}
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeletingCoupon(null)}
          />

          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-foreground">Confirm Coupon Deletion</h3>
            <p className="text-sm text-muted">
              Are you sure you want to delete coupon code{' '}
              <strong className="text-foreground uppercase font-mono">{deletingCoupon.code}</strong>?
              {deletingCoupon.usage_count > 0 ? (
                <span className="block mt-2 font-bold text-amber-600">
                  Note: This coupon code has already been redeemed {deletingCoupon.usage_count} times.
                </span>
              ) : null}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingCoupon(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDeleteCoupon(deletingCoupon.id)}
                isLoading={submitting}
                disabled={submitting}
              >
                Delete Coupon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
