'use client'

import React, { useState, useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

export default function StoreSettingsPage() {
  const { settings, loading: contextLoading, updateSetting } = useSettings()

  const [formData, setFormData] = useState({
    currency_code: 'USD',
    currency_symbol: '$',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setFormData({
        currency_code: settings.store_currency?.code || 'USD',
        currency_symbol: settings.store_currency?.symbol || '$',
      })
    }
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const currencyObj = {
        code: formData.currency_code.trim().toUpperCase() || 'USD',
        symbol: formData.currency_symbol.trim() || '$',
      }

      const ok = await updateSetting('store_currency', currencyObj)

      if (ok) {
        setSuccessMsg('Store & currency settings saved successfully.')
      } else {
        setErrorMsg('Failed to save store settings. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving store settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSyncRates = async () => {
    try {
      setIsSyncing(true)
      setSuccessMsg(null)
      setErrorMsg(null)
      const res = await fetch('/api/cron/update-exchange-rates', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg(`Exchange rates synced successfully (${Object.keys(data.rates || {}).length} currencies updated).`)
      } else {
        setErrorMsg(data.error || 'Failed to sync exchange rates.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error syncing exchange rates.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading store & currency settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="border border-green-200 bg-green-50 p-4 rounded-sm text-xs text-[#2F6B3C] font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs text-[#2F6B3C] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-sm text-xs text-red-700 font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs text-red-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Base Store Currency Form */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3">
          <h2 className="text-base font-semibold text-[#1C2521]">Store & Base Currency</h2>
          <p className="text-xs text-[#6B7570]">
            Base store currency configuration for price displays across the storefront.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Base Currency Code"
              name="currency_code"
              value={formData.currency_code}
              onChange={handleChange}
              placeholder="e.g. USD"
              disabled={isSaving}
            />

            <Input
              label="Base Currency Symbol"
              name="currency_symbol"
              value={formData.currency_symbol}
              onChange={handleChange}
              placeholder="e.g. $ or Rs."
              helperText="Primary symbol rendered alongside base prices."
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving}
            >
              Save Base Currency Settings
            </Button>
          </div>
        </form>
      </section>

      {/* Section: Multi-Currency & Exchange Rates */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1C2521]">Multi-Currency & Exchange Rates</h2>
            <p className="text-xs text-[#6B7570]">
              Store base currency is <strong>USD</strong>. Foreign exchange rates update automatically via background cron.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSyncRates}
            isLoading={isSyncing}
            disabled={isSaving || isSyncing}
          >
            🔄 Sync Exchange Rates Now
          </Button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-4 bg-[#F4F6F4]/50 border border-[#E7ECE8] rounded-[4px]">
            <div>
              <span className="font-semibold text-[#1C2521] block">Automatic Currency Location Detection</span>
              <span className="text-[#6B7570]">Detect visitor location via request IP headers and auto-select regional currency on first visit.</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={async (e) => {
                  const enabled = e.target.checked
                  await updateSetting('auto_currency_detection_enabled', { value: enabled })
                  setSuccessMsg(`Auto currency location detection ${enabled ? 'enabled' : 'disabled'}.`)
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#E7ECE8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2F6B3C]"></div>
            </label>
          </div>

          <div className="pt-2">
            <h3 className="font-semibold text-[#1C2521] mb-2">Supported Currencies & Current Rates (1 USD = X):</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { code: 'USD', name: 'US Dollar', symbol: '$', rate: '1.0000', flag: '🇺🇸' },
                { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', rate: '300.00', flag: '🇱🇰' },
                { code: 'GBP', name: 'British Pound', symbol: '£', rate: '0.7800', flag: '🇬🇧' },
                { code: 'EUR', name: 'Euro', symbol: '€', rate: '0.9200', flag: '🇪🇺' },
                { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: '1.5200', flag: '🇦🇺' },
                { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: '1.3800', flag: '🇨🇦' },
                { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: '83.5000', flag: '🇮🇳' },
              ].map((c) => (
                <div key={c.code} className="border border-[#E7ECE8] p-3 rounded-[4px] bg-white space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#1C2521]">
                    <span>{c.flag}</span>
                    <span>{c.code}</span>
                    <span className="text-[#6B7570] font-normal text-[10px]">({c.symbol})</span>
                  </div>
                  <div className="text-[#6B7570] text-[11px]">1 USD = {c.rate} {c.code}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
