'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Badge } from '@/components/atoms/Badge'
import { PriceTag } from '@/components/atoms/PriceTag'
import { WeightTag } from '@/components/atoms/WeightTag'
import { EmptyState } from '@/components/atoms/EmptyState'

export default function AdminShippingPage() {
  const [countries, setCountries] = useState<Tables<'countries'>[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null)
  const [shippingTiers, setShippingTiers] = useState<Tables<'shipping_tiers'>[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingTiers, setLoadingTiers] = useState(false)

  // Country Modal State
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false)
  const [editingCountry, setEditingCountry] = useState<Tables<'countries'> | null>(null)
  const [countryName, setCountryName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [countryActive, setCountryActive] = useState(true)
  const [submittingCountry, setSubmittingCountry] = useState(false)

  // Tier Modal State
  const [isTierModalOpen, setIsTierModalOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<Tables<'shipping_tiers'> | null>(null)
  const [tierWeightKg, setTierWeightKg] = useState<number | ''>('')
  const [tierPrice, setTierPrice] = useState<number | ''>('')
  const [submittingTier, setSubmittingTier] = useState(false)

  const fetchCountries = useCallback(async () => {
    setLoadingCountries(true)
    const supabase = createClient() as any
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching countries:', error)
    } else {
      setCountries(data || [])
      if (data && data.length > 0 && !selectedCountryId) {
        setSelectedCountryId(data[0].id)
      }
    }
    setLoadingCountries(false)
  }, [selectedCountryId])

  const fetchTiers = useCallback(async (countryId: string) => {
    setLoadingTiers(true)
    const supabase = createClient() as any
    const { data, error } = await supabase
      .from('shipping_tiers')
      .select('*')
      .eq('country_id', countryId)
      .order('weight_kg', { ascending: true })

    if (error) {
      console.error('Error fetching shipping tiers:', error)
    } else {
      setShippingTiers(data || [])
    }
    setLoadingTiers(false)
  }, [])

  useEffect(() => {
    fetchCountries()
  }, [fetchCountries])

  useEffect(() => {
    if (selectedCountryId) {
      fetchTiers(selectedCountryId)
    } else {
      setShippingTiers([])
    }
  }, [selectedCountryId, fetchTiers])

  // Country Handlers
  const openAddCountryModal = () => {
    setEditingCountry(null)
    setCountryName('')
    setCountryCode('')
    setCountryActive(true)
    setIsCountryModalOpen(true)
  }

  const openEditCountryModal = (country: Tables<'countries'>) => {
    setEditingCountry(country)
    setCountryName(country.name)
    setCountryCode(country.code)
    setCountryActive(country.is_active)
    setIsCountryModalOpen(true)
  }

  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingCountry(true)
    const supabase = createClient() as any

    const nameClean = countryName.trim()
    const codeClean = countryCode.trim().toUpperCase()

    if (editingCountry) {
      const { error } = await supabase
        .from('countries')
        .update({ name: nameClean, code: codeClean, is_active: countryActive })
        .eq('id', editingCountry.id)

      if (error) {
        alert(`Error updating country: ${error.message}`)
      } else {
        setIsCountryModalOpen(false)
        fetchCountries()
      }
    } else {
      const { data, error } = await supabase
        .from('countries')
        .insert({ name: nameClean, code: codeClean, is_active: countryActive })
        .select('id')
        .single()

      if (error) {
        alert(`Error adding country: ${error.message}`)
      } else {
        setIsCountryModalOpen(false)
        setSelectedCountryId(data.id)
        fetchCountries()
      }
    }
    setSubmittingCountry(false)
  }

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this country and all its shipping tiers?')) return

    const supabase = createClient() as any
    const { error } = await supabase.from('countries').delete().eq('id', id)

    if (error) {
      alert(`Failed to delete country: ${error.message}`)
    } else {
      if (selectedCountryId === id) {
        setSelectedCountryId(null)
      }
      fetchCountries()
    }
  }

  // Tier Handlers
  const openAddTierModal = (presetWeight?: number) => {
    setEditingTier(null)
    setTierWeightKg(presetWeight !== undefined ? presetWeight : '')
    setTierPrice('')
    setIsTierModalOpen(true)
  }

  const openEditTierModal = (tier: Tables<'shipping_tiers'>) => {
    setEditingTier(tier)
    setTierWeightKg(tier.weight_kg)
    setTierPrice(tier.price)
    setIsTierModalOpen(true)
  }

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCountryId) return
    setSubmittingTier(true)

    const supabase = createClient() as any
    const wKg = Number(tierWeightKg)
    const pVal = Number(tierPrice)

    if (isNaN(wKg) || wKg <= 0) {
      alert('Please enter a valid weight bracket > 0 kg')
      setSubmittingTier(false)
      return
    }

    if (isNaN(pVal) || pVal < 0) {
      alert('Please enter a valid price >= 0')
      setSubmittingTier(false)
      return
    }

    if (editingTier) {
      const { error } = await supabase
        .from('shipping_tiers')
        .update({ weight_kg: wKg, price: pVal })
        .eq('id', editingTier.id)

      if (error) alert(`Error updating tier: ${error.message}`)
      else {
        setIsTierModalOpen(false)
        fetchTiers(selectedCountryId)
      }
    } else {
      // Check if bracket for this weight already exists
      const existing = shippingTiers.find((t) => t.weight_kg === wKg)
      if (existing) {
        // Update price for existing bracket
        const { error } = await supabase
          .from('shipping_tiers')
          .update({ price: pVal })
          .eq('id', existing.id)
        if (error) alert(`Error updating tier: ${error.message}`)
      } else {
        const { error } = await supabase
          .from('shipping_tiers')
          .insert({ country_id: selectedCountryId, weight_kg: wKg, price: pVal })
        if (error) alert(`Error adding tier: ${error.message}`)
      }
      setIsTierModalOpen(false)
      fetchTiers(selectedCountryId)
    }
    setSubmittingTier(false)
  }

  const handleDeleteTier = async (id: string) => {
    const supabase = createClient() as any
    const { error } = await supabase.from('shipping_tiers').delete().eq('id', id)
    if (error) alert(`Error deleting tier: ${error.message}`)
    else if (selectedCountryId) fetchTiers(selectedCountryId)
  }

  const selectedCountry = countries.find((c) => c.id === selectedCountryId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Shipping Tiers Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Configure destination countries and weight-bracket shipping rates.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openAddCountryModal} className="font-semibold shrink-0">
          + Add New Country
        </Button>
      </div>

      {/* Countries Selector Pills */}
      {loadingCountries ? (
        <div className="py-4 text-sm text-muted animate-pulse font-medium">Loading countries...</div>
      ) : countries.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8">
          <EmptyState
            title="No Destination Countries"
            description="Add your first shipping country to set up weight brackets."
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {countries.map((c) => {
            const isSelected = c.id === selectedCountryId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCountryId(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-accent text-accent-foreground border-accent shadow-xs'
                    : 'bg-surface text-foreground border-border hover:bg-surface-hover'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-xs font-mono opacity-80">({c.code})</span>
                {!c.is_active && (
                  <span className="text-[10px] uppercase font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                    Disabled
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Shipping Tiers Area for Selected Country */}
      {selectedCountry && (
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  {selectedCountry.name} ({selectedCountry.code})
                </h2>
                <Badge variant={selectedCountry.is_active ? 'success' : 'secondary'} size="sm">
                  {selectedCountry.is_active ? 'Active Destination' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Manage weight-bracket tiers for orders shipped to {selectedCountry.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEditCountryModal(selectedCountry)}
              >
                Edit Country
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteCountry(selectedCountry.id)}
              >
                Delete Country
              </Button>
            </div>
          </div>

          {/* Preset Quick Add Bar */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted block">
              Suggested Bracket Presets
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 3, 5, 11].map((weightPreset) => {
                const isExisting = shippingTiers.some((t) => t.weight_kg === weightPreset)
                return (
                  <Button
                    key={weightPreset}
                    variant={isExisting ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => openAddTierModal(weightPreset)}
                    className="text-xs font-semibold"
                  >
                    + {weightPreset} kg Bracket {isExisting ? '(Configured)' : ''}
                  </Button>
                )
              })}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => openAddTierModal()}
                className="text-xs font-semibold"
              >
                + Custom Weight Bracket
              </Button>
            </div>
          </div>

          {/* Tiers Table */}
          {loadingTiers ? (
            <div className="py-8 text-center text-sm text-muted animate-pulse font-medium">
              Loading shipping rates...
            </div>
          ) : shippingTiers.length === 0 ? (
            <div className="py-8 text-center text-muted border border-dashed border-border rounded-xl">
              <p className="text-sm font-medium text-foreground">No shipping tiers configured</p>
              <p className="text-xs text-muted mt-1">
                Use the preset buttons above to add shipping rates for 1kg, 3kg, 5kg, or custom weights.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-hover/60 border-b border-border text-xs font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-3.5">Weight Bracket</th>
                    <th className="px-6 py-3.5">Shipping Price</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {shippingTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-4">
                        <WeightTag weightKg={tier.weight_kg} unit="kg" size="md" />
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        <PriceTag amount={tier.price} size="md" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditTierModal(tier)}
                          >
                            Edit Rate
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteTier(tier.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Country Modal */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsCountryModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-foreground">
              {editingCountry ? 'Edit Country' : 'Add Destination Country'}
            </h3>

            <form onSubmit={handleSaveCountry} className="space-y-4">
              <Input
                label="Country Name"
                required
                placeholder="e.g. Sri Lanka"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                disabled={submittingCountry}
              />

              <Input
                label="Country Code (2 Letters)"
                required
                placeholder="e.g. LK"
                maxLength={3}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={submittingCountry}
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="countryActiveToggle"
                  checked={countryActive}
                  onChange={(e) => setCountryActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="countryActiveToggle" className="text-sm font-semibold text-foreground">
                  Active for shipping
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsCountryModalOpen(false)}
                  disabled={submittingCountry}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="font-semibold"
                  isLoading={submittingCountry}
                  disabled={submittingCountry}
                >
                  {editingCountry ? 'Save Changes' : 'Add Country'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Shipping Tier Modal */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsTierModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-foreground">
              {editingTier ? 'Edit Shipping Tier' : `Add Shipping Tier for ${selectedCountry?.name}`}
            </h3>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <Input
                label="Max Weight Bracket (kg)"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1.00"
                value={tierWeightKg}
                onChange={(e) => setTierWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                disabled={submittingTier}
              />

              <Input
                label="Shipping Price ($)"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="9.99"
                value={tierPrice}
                onChange={(e) => setTierPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                disabled={submittingTier}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsTierModalOpen(false)}
                  disabled={submittingTier}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="font-semibold"
                  isLoading={submittingTier}
                  disabled={submittingTier}
                >
                  {editingTier ? 'Update Rate' : 'Add Rate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
