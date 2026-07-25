'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'

interface CustomerRow {
  id: string
  full_name: string | null
  guest_name?: string | null
  email: string
  guest_email?: string
  phone: string | null
  guest_phone?: string | null
  default_address: string | null
  signup_date: string
  last_order_date: string | null
  order_count: number
  total_spend: number
  average_order_value: number
  is_guest: boolean
}

export default function AdminCustomersPage() {
  const [activeTab, setActiveTab] = useState<'registered' | 'guest'>('registered')
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('signup_date')
  const [sortOrder, setSortOrder] = useState<string>('desc')

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        type: activeTab,
        search: searchQuery,
        sortBy,
        sortOrder,
      })

      const res = await fetch(`/api/admin/customers?${params.toString()}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to fetch customer data')
      }

      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (err: unknown) {
      console.error('Error fetching customers:', err)
      const msg = err instanceof Error ? err.message : 'Error loading customers.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, sortBy, sortOrder])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-[#1C2521]">
      {/* Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Customer Directory ({customers.length})
          </h1>
          <p className="mt-1 text-xs text-[#6B7570] font-normal">
            View registered user profiles and guest repeat buyers.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchCustomers}
        >
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7ECE8] gap-6 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('registered')}
          className={`pb-3 font-medium transition-colors cursor-pointer ${
            activeTab === 'registered'
              ? 'border-b-2 border-[#2F6B3C] text-[#2F6B3C]'
              : 'text-[#6B7570] hover:text-[#1C2521]'
          }`}
        >
          Registered Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guest')}
          className={`pb-3 font-medium transition-colors cursor-pointer ${
            activeTab === 'guest'
              ? 'border-b-2 border-[#2F6B3C] text-[#2F6B3C]'
              : 'text-[#6B7570] hover:text-[#1C2521]'
          }`}
        >
          Guest Customers
        </button>
      </div>

      {/* Search & Sort Bar */}
      <div className="border border-[#E7ECE8] rounded-sm p-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          placeholder="Search by name, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            {
              value: 'signup_date',
              label: activeTab === 'registered' ? 'Signup Date' : 'First Order',
            },
            { value: 'total_spend', label: 'Lifetime Spend' },
            { value: 'order_count', label: 'Total Orders' },
          ]}
        />

        <Select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          options={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' },
          ]}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="border border-[#E7ECE8] rounded-sm p-12 text-center text-xs text-[#6B7570]">
          Loading customer directory...
        </div>
      ) : error ? (
        <div className="border border-[#E7ECE8] rounded-sm p-4 bg-white text-xs text-[#1C2521]">
          {error}
        </div>
      ) : customers.length === 0 ? (
        <div className="border border-[#E7ECE8] rounded-sm p-12 text-center">
          <EmptyState
            title="No customers found"
            description="No customer records match your current filter options."
          />
        </div>
      ) : (
        <div className="border border-[#E7ECE8] rounded-sm bg-white overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-white border-b border-[#E7ECE8] text-[#6B7570] font-normal">
              <tr>
                <th className="p-3 sm:p-4 font-normal">Customer Name</th>
                <th className="p-3 sm:p-4 font-normal">Contact</th>
                <th className="p-3 sm:p-4 font-normal">Orders</th>
                <th className="p-3 sm:p-4 font-normal">Total Spend</th>
                <th className="p-3 sm:p-4 font-normal text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7ECE8]">
              {customers.map((c) => {
                const displayName =
                  c.full_name || c.guest_name || (c.is_guest ? 'Guest Buyer' : 'Customer')
                const email = c.email || c.guest_email || 'N/A'

                return (
                  <tr key={c.id} className="hover:bg-[#F4F6F4]/50 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-[#1C2521]">
                      {displayName}
                    </td>

                    <td className="p-3 sm:p-4 text-[#6B7570]">
                      {email}
                    </td>

                    <td className="p-3 sm:p-4 text-[#1C2521]">
                      {c.order_count}
                    </td>

                    <td className="p-3 sm:p-4 font-semibold text-[#2F6B3C]">
                      ${c.total_spend.toFixed(2)}
                    </td>

                    <td className="p-3 sm:p-4 text-right">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-[#2F6B3C] hover:underline font-medium min-h-[44px] inline-flex items-center justify-end"
                      >
                        Details →
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

