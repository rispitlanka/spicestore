'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { PriceTag } from '@/components/atoms/PriceTag'
import { EmptyState } from '@/components/atoms/EmptyState'
import { CountrySelect } from '@/components/molecules/CountrySelect'
import { AddressForm, AddressFormData } from '@/components/molecules/AddressForm'
import { useCart } from '@/context/CartContext'
import { formatOrderId, getShortOrderId } from '@/lib/utils'
import { Tables } from '@/types/database'

interface OrderWithDetails {
  id: string
  created_at: string
  status: string
  payment_method: string
  address_line1: string
  address_line2?: string | null
  city: string
  district?: string | null
  postal_code?: string | null
  subtotal: number
  shipping_cost: number
  total_amount: number
  total_weight_kg: number
  country?: {
    name: string
    code: string
  } | null
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    unit_weight_kg: number
    products?: {
      name: string
      slug: string
    } | null
    variation?: {
      attributes: Record<string, string | number | boolean> | null
      sku: string | null
    } | null
  }>
}

export default function AccountPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth()
  const { setSelectedCountryId } = useCart()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [defaultCountryId, setDefaultCountryId] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Tables<'countries'> | null>(null)

  const [addressData, setAddressData] = useState<AddressFormData>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    postalCode: '',
  })

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders')

  const isSriLanka =
    selectedCountry?.code?.toUpperCase() === 'LK' ||
    selectedCountry?.name?.toLowerCase() === 'sri lanka'

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
      setDefaultCountryId(profile.default_country_id || '')
      setAddressData({
        addressLine1: profile.default_address_line1 || '',
        addressLine2: profile.default_address_line2 || '',
        city: profile.default_city || '',
        district: profile.default_district || '',
        postalCode: profile.default_postal_code || '',
      })
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '')
    }
  }, [profile, user])

  const fetchOrders = useCallback(async (userId: string) => {
    try {
      setIsLoadingOrders(true)
      setOrdersError(null)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          payment_method,
          address_line1,
          address_line2,
          city,
          district,
          postal_code,
          subtotal,
          discount_amount,
          shipping_cost,
          total_amount,
          total_weight_kg,
          country:countries ( name, code ),
          order_items (
            id,
            quantity,
            unit_price,
            unit_weight_kg,
            products ( name, slug ),
            variation:product_variations ( attributes, sku )
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching order history:', error.message || error)
        setOrdersError('Failed to load order history.')
        setOrders([])
        return
      }

      setOrders((data as unknown as OrderWithDetails[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Error fetching order history:', msg)
      setOrdersError('Failed to load order history.')
      setOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchOrders(user.id)
    }
  }, [user?.id, fetchOrders])

  const handleAddressChange = (field: keyof AddressFormData, val: string) => {
    setAddressData((prev) => ({ ...prev, [field]: val }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSuccess(null)
    setProfileError(null)

    if (!user) return

    try {
      setIsSavingProfile(true)
      const supabase = createClient()
      const { error } = await supabase.from('customer_profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        default_address_line1: addressData.addressLine1.trim() || null,
        default_address_line2: addressData.addressLine2.trim() || null,
        default_city: addressData.city.trim() || null,
        default_district: addressData.district.trim() || null,
        default_postal_code: addressData.postalCode.trim() || null,
        default_country_id: defaultCountryId || null,
      } as any)

      if (error) {
        throw error
      }

      await refreshProfile()
      if (defaultCountryId) {
        setSelectedCountryId(defaultCountryId)
      }
      setProfileSuccess('Profile details saved successfully.')
      setTimeout(() => setProfileSuccess(null), 4000)
    } catch (err: unknown) {
      console.error('Error updating profile:', err)
      const message = err instanceof Error ? err.message : 'Failed to update profile.'
      setProfileError(message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex items-center justify-center font-sans text-sm text-[#6B7570]">
        Loading account details...
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto font-sans">
        <div className="border border-[#E7ECE8] rounded-sm p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-normal text-[#1C2521] tracking-tight">
              Sign In Required
            </h1>
            <p className="text-xs text-[#6B7570]">
              Sign in to view your profile and order history.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/account/login?redirect=/account" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/account/signup?redirect=/account" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans space-y-8">
      {/* Account Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            {fullName || 'Customer Profile'}
          </h1>
          <p className="text-xs text-[#6B7570] font-normal">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-[#6B7570] hover:text-[#1C2521] underline cursor-pointer min-h-[44px] inline-flex items-center"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7ECE8] gap-4 sm:gap-6 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`pb-3 font-medium transition-colors cursor-pointer min-h-[44px] inline-flex items-center ${
            activeTab === 'orders'
              ? 'border-b-2 border-[#2F6B3C] text-[#2F6B3C]'
              : 'text-[#6B7570] hover:text-[#1C2521]'
          }`}
        >
          Order History ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 font-medium transition-colors cursor-pointer min-h-[44px] inline-flex items-center ${
            activeTab === 'profile'
              ? 'border-b-2 border-[#2F6B3C] text-[#2F6B3C]'
              : 'text-[#6B7570] hover:text-[#1C2521]'
          }`}
        >
          Profile Details
        </button>
      </div>

      {/* Order History Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {isLoadingOrders ? (
            <div className="border border-[#E7ECE8] rounded-sm p-12 text-center text-sm text-[#6B7570]">
              Loading order history...
            </div>
          ) : ordersError ? (
            <div className="p-4 rounded-sm border border-[#E7ECE8] bg-white text-[#1C2521] text-sm">
              {ordersError}
            </div>
          ) : orders.length === 0 ? (
            <div className="border border-[#E7ECE8] rounded-sm p-12 text-center space-y-4">
              <EmptyState
                title="No orders yet"
                description="You haven't placed any orders with us yet."
                action={
                  <Link href="/">
                    <Button variant="primary" size="md">
                      Browse Catalog
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="border border-[#E7ECE8] rounded-sm divide-y divide-[#E7ECE8] overflow-hidden bg-white">
              {orders.map((order) => {
                const isDelivered = order.status.toLowerCase() === 'delivered'
                return (
                  <div key={order.id} className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-medium text-[#1C2521]">
                          {formatOrderId(order.id)}
                        </span>
                        <span className="text-[#6B7570]" suppressHydrationWarning>
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status in Plain Text (Green for Delivered only) */}
                        <span
                          className={
                            isDelivered
                              ? 'text-[#2F6B3C] font-semibold uppercase tracking-wider'
                              : 'text-[#6B7570] font-normal uppercase tracking-wider'
                          }
                        >
                          {order.status}
                        </span>

                        <Link
                          href={`/order-confirmation/${getShortOrderId(order.id)}`}
                          className="text-xs text-[#2F6B3C] hover:underline font-medium"
                        >
                          View Receipt →
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#6B7570] border-t border-[#E7ECE8] pt-2">
                      <div>
                        {order.order_items.map((i) => i.products?.name).filter(Boolean).join(', ')}
                      </div>
                      <div className="font-medium text-[#1C2521] flex items-center gap-1">
                        <span>Total:</span>
                        <PriceTag amount={order.total_amount} size="sm" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-xl border border-[#E7ECE8] rounded-sm p-6 sm:p-8 bg-white space-y-6">
          <h2 className="text-base font-semibold text-[#1C2521] border-b border-[#E7ECE8] pb-3">
            Customer Information
          </h2>

          {profileSuccess && (
            <div className="p-3 rounded-sm border border-[#E7ECE8] bg-white text-[#2F6B3C] text-xs font-normal">
              {profileSuccess}
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-sm border border-[#E7ECE8] bg-white text-[#1C2521] text-xs font-normal">
              {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              disabled={isSavingProfile}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +94 77 123 4567"
              disabled={isSavingProfile}
            />

            <CountrySelect
              label="Default Delivery Country"
              value={defaultCountryId}
              onCountryChange={(id, country) => {
                setDefaultCountryId(id)
                setSelectedCountry(country || null)
              }}
              disabled={isSavingProfile}
              helperText="Used to prefill destination country on cart and checkout pages."
            />

            {/* Editable Default Delivery Address Section */}
            <div className="pt-4 border-t border-[#E7ECE8] space-y-4">
              <h3 className="text-sm font-semibold text-[#1C2521]">
                Default Delivery Address
              </h3>

              <AddressForm
                value={addressData}
                onChange={handleAddressChange}
                isSriLanka={isSriLanka}
                disabled={isSavingProfile}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Saving Profile...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      )}
    </main>
  )
}
