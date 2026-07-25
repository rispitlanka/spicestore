'use client'

import React, { useState, useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

export default function OrderSettingsPage() {
  const { settings, loading: contextLoading, updateSetting } = useSettings()

  const [formData, setFormData] = useState({
    order_number_prefix: 'YS',
    low_stock_threshold: '5',
    default_shipping_note: 'Cash on Delivery • Ships internationally',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setFormData({
        order_number_prefix: settings.order_number_prefix || 'YS',
        low_stock_threshold: String(settings.low_stock_threshold ?? 5),
        default_shipping_note: settings.default_shipping_note || 'Cash on Delivery • Ships internationally',
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
      const thresholdNum = parseInt(formData.low_stock_threshold, 10)
      if (isNaN(thresholdNum) || thresholdNum < 0) {
        setErrorMsg('Low stock threshold must be a non-negative integer.')
        setIsSaving(false)
        return
      }

      const prefix = formData.order_number_prefix.trim().toUpperCase() || 'YS'

      const ok1 = await updateSetting('order_number_prefix', { value: prefix })
      const ok2 = await updateSetting('low_stock_threshold', { value: thresholdNum })
      const ok3 = await updateSetting('default_shipping_note', { value: formData.default_shipping_note.trim() })

      if (ok1 && ok2 && ok3) {
        setSuccessMsg('Order configuration settings saved successfully.')
      } else {
        setErrorMsg('Failed to save order settings. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving order settings.')
    } finally {
      setIsSaving(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading order settings...
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

      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3">
          <h2 className="text-base font-semibold text-[#1C2521]">Order Settings</h2>
          <p className="text-xs text-[#6B7570]">
            Order number formatting, stock alert limits, and checkout shipping note defaults.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Order Number Prefix"
              name="order_number_prefix"
              value={formData.order_number_prefix}
              onChange={handleChange}
              placeholder="e.g. YS"
              helperText="Generated order codes will format as YS-00001, YS-00002, etc."
              disabled={isSaving}
            />

            <Input
              label="Low Stock Threshold"
              name="low_stock_threshold"
              type="number"
              min="0"
              value={formData.low_stock_threshold}
              onChange={handleChange}
              placeholder="e.g. 5"
              helperText="Variations with stock at or below this limit trigger inventory alerts."
              disabled={isSaving}
            />
          </div>

          <Input
            label="Default Shipping Note (Checkout Subtitle)"
            name="default_shipping_note"
            value={formData.default_shipping_note}
            onChange={handleChange}
            placeholder="e.g. Cash on Delivery • Ships internationally"
            helperText="Subtitle text displayed directly below the Checkout header."
            disabled={isSaving}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving}
            >
              Save Order Settings
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
