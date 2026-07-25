'use client'

import React, { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { AddressForm, AddressFormData } from '@/components/molecules/AddressForm'
import { CustomerOrderList, CustomerOrder } from '@/components/organisms/CustomerOrderList'

interface CustomerDetail {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  default_address_line1: string | null
  default_address_line2: string | null
  default_city: string | null
  default_district: string | null
  default_postal_code: string | null
  default_country_id: string | null
  signup_date: string
  last_order_date: string | null
  is_guest: boolean
}

interface CustomerStats {
  total_spend: number
  order_count: number
  average_order_value: number
}

export default function AdminCustomerDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(paramsPromise)

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressData, setAddressData] = useState<AddressFormData>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    postalCode: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/customers/${id}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to fetch customer details.')
      }

      const data = await res.json()
      setCustomer(data.customer)
      setStats(data.stats)
      setOrders(data.orders || [])

      if (data.customer) {
        setFullName(data.customer.full_name || '')
        setPhone(data.customer.phone || '')
        setAddressData({
          addressLine1: data.customer.default_address_line1 || '',
          addressLine2: data.customer.default_address_line2 || '',
          city: data.customer.default_city || '',
          district: data.customer.default_district || '',
          postalCode: data.customer.default_postal_code || '',
        })
      }
    } catch (err: unknown) {
      console.error('Error loading customer detail:', err)
      const msg = err instanceof Error ? err.message : 'Error fetching customer details.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCustomerDetails()
  }, [fetchCustomerDetails])

  const handleAddressChange = (field: keyof AddressFormData, val: string) => {
    setAddressData((prev) => ({ ...prev, [field]: val }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer || customer.is_guest) return

    try {
      setIsSaving(true)
      setSaveSuccess(false)
      setError(null)

      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          default_address_line1: addressData.addressLine1.trim() || null,
          default_address_line2: addressData.addressLine2.trim() || null,
          default_city: addressData.city.trim() || null,
          default_district: addressData.district.trim() || null,
          default_postal_code: addressData.postalCode.trim() || null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update customer profile.')
      }

      setSaveSuccess(true)
      fetchCustomerDetails()
    } catch (err: unknown) {
      console.error('Failed to update profile:', err)
      const msg = err instanceof Error ? err.message : 'Update failed.'
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="border border-[#E7ECE8] rounded-sm p-12 text-center text-xs text-[#6B7570] font-sans">
        Loading customer details...
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-6 max-w-md mx-auto font-sans text-center">
        <Link href="/admin/customers">
          <Button variant="secondary" size="sm">
            ← Back to Customers
          </Button>
        </Link>
        <div className="p-4 border border-[#E7ECE8] rounded-sm bg-white text-xs text-[#1C2521]">
          {error || 'Customer not found'}
        </div>
      </div>
    )
  }

  const displayName =
    customer.full_name || (customer.is_guest ? 'Guest Buyer' : 'Unnamed Account')

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans text-[#1C2521]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7ECE8] pb-4">
        <div>
          <Link
            href="/admin/customers"
            className="text-xs text-[#6B7570] hover:text-[#1C2521] underline block mb-2"
          >
            ← Back to Customers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
              {displayName}
            </h1>
            <span className="text-xs text-[#6B7570] font-normal">
              ({customer.is_guest ? 'Guest' : 'Registered User'})
            </span>
          </div>
          <p className="text-xs text-[#6B7570] mt-1 font-mono">{customer.email}</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchCustomerDetails}
        >
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="border border-[#E7ECE8] rounded-sm p-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-[#6B7570] block">Lifetime Spend</span>
          <span className="text-base font-semibold text-[#2F6B3C]">
            ${(stats?.total_spend || 0).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[#6B7570] block">Total Orders</span>
          <span className="text-base font-semibold text-[#1C2521]">
            {stats?.order_count || 0}
          </span>
        </div>
        <div>
          <span className="text-[#6B7570] block">Average Order Value</span>
          <span className="text-base font-semibold text-[#1C2521]">
            ${(stats?.average_order_value || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4 text-xs">
        <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
          Customer Profile
        </h2>

        {saveSuccess && (
          <div className="p-3 rounded-sm border border-[#E7ECE8] bg-white text-[#2F6B3C] font-normal">
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={customer.is_guest}
            placeholder="Customer Name"
          />

          <Input
            label="Email"
            type="text"
            value={customer.email}
            disabled
          />

          <Input
            label="Phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={customer.is_guest}
            placeholder="Phone number"
          />

          <div className="pt-2 border-t border-[#E7ECE8] space-y-3">
            <label className="text-xs text-[#1C2521] block font-semibold">
              Default Delivery Address
            </label>
            <AddressForm
              value={addressData}
              onChange={handleAddressChange}
              isSriLanka={true}
              disabled={customer.is_guest || isSaving}
            />
          </div>

          {!customer.is_guest && (
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                variant="primary"
                size="md"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Order History */}
      <div className="pt-2">
        <CustomerOrderList orders={orders} title={`Order History for ${displayName}`} />
      </div>
    </div>
  )
}
