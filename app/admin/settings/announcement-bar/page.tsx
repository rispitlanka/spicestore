'use client'

import React, { useState, useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { AnnouncementBarSetting, AnnouncementBarMessage, DEFAULT_ANNOUNCEMENT_BAR } from '@/lib/settings'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

export default function AnnouncementBarSettingsPage() {
  const { settings, loading: contextLoading, updateSetting } = useSettings()

  const [config, setConfig] = useState<AnnouncementBarSetting>(DEFAULT_ANNOUNCEMENT_BAR)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize form state from context
  useEffect(() => {
    if (settings?.announcement_bar) {
      setConfig({
        is_active: Boolean(settings.announcement_bar.is_active),
        messages: Array.isArray(settings.announcement_bar.messages) && settings.announcement_bar.messages.length > 0
          ? settings.announcement_bar.messages.map((m) => ({ text: m.text || '', link_url: m.link_url || '' }))
          : [{ text: 'Free shipping on orders above $50', link_url: '' }],
        background_color: settings.announcement_bar.background_color || '#2F6B3C',
        text_color: settings.announcement_bar.text_color || '#FFFFFF',
        dismissible: settings.announcement_bar.dismissible ?? true,
      })
    }
  }, [settings])

  // Master Active Toggle
  const handleToggleActive = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, is_active: e.target.checked }))
  }

  // Dismissible Toggle
  const handleToggleDismissible = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, dismissible: e.target.checked }))
  }

  // Messages handling
  const handleMessageTextChange = (index: number, text: string) => {
    setConfig((prev) => {
      const updated = [...prev.messages]
      updated[index] = { ...updated[index], text }
      return { ...prev, messages: updated }
    })
  }

  const handleMessageLinkChange = (index: number, link_url: string) => {
    setConfig((prev) => {
      const updated = [...prev.messages]
      updated[index] = { ...updated[index], link_url }
      return { ...prev, messages: updated }
    })
  }

  const handleAddMessage = () => {
    setConfig((prev) => ({
      ...prev,
      messages: [...prev.messages, { text: '', link_url: '' }],
    }))
  }

  const handleRemoveMessage = (index: number) => {
    if (config.messages.length <= 1) {
      setErrorMsg('At least one message item must be present.')
      return
    }
    setConfig((prev) => ({
      ...prev,
      messages: prev.messages.filter((_, idx) => idx !== index),
    }))
  }

  const handleMoveMessage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= config.messages.length) return

    setConfig((prev) => {
      const copy = [...prev.messages]
      const temp = copy[index]
      copy[index] = copy[targetIdx]
      copy[targetIdx] = temp
      return { ...prev, messages: copy }
    })
  }

  // Save changes handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    // Validation
    const cleanMessages = config.messages.map((m) => ({
      text: m.text.trim(),
      link_url: m.link_url?.trim() || '',
    }))

    const validMessages = cleanMessages.filter((m) => m.text.length > 0)

    if (config.is_active && validMessages.length === 0) {
      setErrorMsg('Announcement bar is active, but no message text was provided.')
      setIsSaving(false)
      return
    }

    const payload: AnnouncementBarSetting = {
      is_active: config.is_active,
      messages: validMessages.length > 0 ? validMessages : [{ text: 'Free shipping on orders above $50', link_url: '' }],
      background_color: config.background_color || '#2F6B3C',
      text_color: config.text_color || '#FFFFFF',
      dismissible: config.dismissible,
    }

    try {
      const success = await updateSetting('announcement_bar', payload)
      if (success) {
        setSuccessMsg('Announcement Bar settings saved successfully!')
      } else {
        setErrorMsg('Failed to save settings. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving settings.')
    } finally {
      setIsSaving(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading Announcement Bar settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Banners */}
      {successMsg && (
        <div className="border border-green-200 bg-green-50 p-4 rounded-sm text-xs text-[#2F6B3C] font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
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
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs text-red-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Activation Switch */}
        <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4">
          <div className="border-b border-[#E7ECE8] pb-3">
            <h2 className="text-base font-semibold text-[#1C2521]">Activation Switch</h2>
            <p className="text-xs text-[#6B7570]">
              Master toggle to enable or disable the site-wide top announcement bar.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border border-[#E7ECE8] rounded-sm bg-[#F4F6F4]/50">
            <div>
              <span className="text-sm font-semibold text-[#1C2521] block">
                Enable Announcement Bar
              </span>
              <span className="text-xs text-[#6B7570]">
                When active, displays at the very top of all pages above the site header.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.is_active}
                onChange={handleToggleActive}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6B3C]"></div>
            </label>
          </div>
        </section>

        {/* Section 2: Messages Manager */}
        <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4">
          <div className="border-b border-[#E7ECE8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#1C2521]">Announcement Messages</h2>
              <p className="text-xs text-[#6B7570]">
                Add one or multiple rotating messages. If 2+ messages exist, arrow controls and 4s auto-advance will be enabled.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddMessage}
              disabled={isSaving}
            >
              + Add Message
            </Button>
          </div>

          <div className="space-y-4">
            {config.messages.map((msg: AnnouncementBarMessage, idx: number) => (
              <div
                key={idx}
                className="p-4 border border-[#E7ECE8] rounded-sm bg-white space-y-3 relative group hover:border-[#2F6B3C]/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#6B7570]">
                      Message #{idx + 1}
                    </span>
                    {config.messages.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveMessage(idx, 'up')}
                          disabled={idx === 0 || isSaving}
                          className="px-1.5 py-0.5 text-xs text-[#6B7570] hover:text-[#1C2521] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-[#E7ECE8] rounded-[2px]"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMessage(idx, 'down')}
                          disabled={idx === config.messages.length - 1 || isSaving}
                          className="px-1.5 py-0.5 text-xs text-[#6B7570] hover:text-[#1C2521] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-[#E7ECE8] rounded-[2px]"
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>

                  {config.messages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMessage(idx)}
                      disabled={isSaving}
                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-sm transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Message Text *"
                    name={`message_text_${idx}`}
                    value={msg.text}
                    onChange={(e) => handleMessageTextChange(idx, e.target.value)}
                    placeholder="e.g. Free shipping on orders above $50"
                    disabled={isSaving}
                    required
                  />

                  <Input
                    label="Link URL (Optional)"
                    name={`message_link_${idx}`}
                    value={msg.link_url || ''}
                    onChange={(e) => handleMessageLinkChange(idx, e.target.value)}
                    placeholder="e.g. /category/spices or https://..."
                    disabled={isSaving}
                    helperText="Shopper clicking this message navigates here. Leave empty for non-clickable text."
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Visual Styling */}
        <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
          <div className="border-b border-[#E7ECE8] pb-3">
            <h2 className="text-base font-semibold text-[#1C2521]">Visual Appearance & Palette</h2>
            <p className="text-xs text-[#6B7570]">
              Customize colors to match your brand palette (e.g. deep green, navy, or neutral tones).
            </p>
          </div>

          <div className="p-3 border border-amber-200 bg-amber-50/70 rounded-sm text-xs text-amber-900 flex items-start gap-2">
            <span className="text-amber-600 font-bold shrink-0">💡 Note:</span>
            <span>
              We recommend keeping background colors within the store brand palette (deep green, navy, or dark slate) to maintain a refined, minimal design system. Avoid overly jarring high-saturation colors above the header.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Background Color Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1C2521]">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.background_color}
                  onChange={(e) => setConfig((prev) => ({ ...prev, background_color: e.target.value }))}
                  disabled={isSaving}
                  className="w-10 h-10 border border-[#E7ECE8] rounded-sm cursor-pointer p-1 bg-white shrink-0"
                />
                <Input
                  name="background_color"
                  value={config.background_color}
                  onChange={(e) => setConfig((prev) => ({ ...prev, background_color: e.target.value }))}
                  placeholder="#2F6B3C"
                  disabled={isSaving}
                  className="flex-1 uppercase font-mono"
                />
              </div>

              {/* Color Presets */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-[#6B7570]">Brand Presets:</span>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, background_color: '#2F6B3C' }))}
                  className="w-5 h-5 rounded-full border border-black/10 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#2F6B3C' }}
                  title="Brand Green (#2F6B3C)"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, background_color: '#1C2521' }))}
                  className="w-5 h-5 rounded-full border border-black/10 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#1C2521' }}
                  title="Deep Navy (#1C2521)"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, background_color: '#1E293B' }))}
                  className="w-5 h-5 rounded-full border border-black/10 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#1E293B' }}
                  title="Dark Slate (#1E293B)"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, background_color: '#8B0000' }))}
                  className="w-5 h-5 rounded-full border border-black/10 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#8B0000' }}
                  title="Deep Crimson (#8B0000)"
                />
              </div>
            </div>

            {/* Text Color Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1C2521]">
                Text & Control Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.text_color}
                  onChange={(e) => setConfig((prev) => ({ ...prev, text_color: e.target.value }))}
                  disabled={isSaving}
                  className="w-10 h-10 border border-[#E7ECE8] rounded-sm cursor-pointer p-1 bg-white shrink-0"
                />
                <Input
                  name="text_color"
                  value={config.text_color}
                  onChange={(e) => setConfig((prev) => ({ ...prev, text_color: e.target.value }))}
                  placeholder="#FFFFFF"
                  disabled={isSaving}
                  className="flex-1 uppercase font-mono"
                />
              </div>

              {/* Text Presets */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-[#6B7570]">Text Presets:</span>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, text_color: '#FFFFFF' }))}
                  className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#FFFFFF' }}
                  title="Pure White (#FFFFFF)"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, text_color: '#F4F6F4' }))}
                  className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#F4F6F4' }}
                  title="Soft Off-White (#F4F6F4)"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, text_color: '#1C2521' }))}
                  className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer shadow-xs"
                  style={{ backgroundColor: '#1C2521' }}
                  title="Dark Charcoal (#1C2521)"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-1.5 pt-2">
            <span className="block text-xs font-semibold text-[#1C2521]">Live Style Preview</span>
            <div
              style={{ backgroundColor: config.background_color, color: config.text_color }}
              className="min-h-[40px] px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium rounded-sm border border-gray-200"
            >
              <div className="mx-auto flex items-center justify-center gap-2">
                {config.messages.length > 1 && <span>‹</span>}
                <span>{config.messages[0]?.text || 'Sample Announcement Text'}</span>
                {config.messages.length > 1 && <span>›</span>}
              </div>
              {config.dismissible && <span className="text-xs font-bold opacity-80">✕</span>}
            </div>
          </div>
        </section>

        {/* Section 4: Dismissibility */}
        <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-4">
          <div className="border-b border-[#E7ECE8] pb-3">
            <h2 className="text-base font-semibold text-[#1C2521]">Session Dismissal</h2>
            <p className="text-xs text-[#6B7570]">
              Allow shoppers to hide the announcement bar during their active browser session.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border border-[#E7ECE8] rounded-sm bg-[#F4F6F4]/50">
            <div>
              <span className="text-sm font-semibold text-[#1C2521] block">
                Allow Shopper Dismissal (Close Button)
              </span>
              <span className="text-xs text-[#6B7570]">
                Shows a small close button. Dismissal is saved in <code className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded-xs">sessionStorage</code> so it reappears on their next visit.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.dismissible}
                onChange={handleToggleDismissible}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6B3C]"></div>
            </label>
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            disabled={isSaving}
          >
            Save Announcement Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
