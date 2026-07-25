'use client'

import React, { useState, useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'
import { uploadImageToCloudinary } from '@/lib/cloudinary/upload'

export default function GeneralSettingsPage() {
  const { settings, loading: contextLoading, updateSetting } = useSettings()

  const [formData, setFormData] = useState({
    logo_url: '',
    favicon_url: '',
    site_title: 'Yarl Samayal',
    site_tagline: '',
    meta_description: '',

    store_contact_email: '',
    store_contact_phone: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setFormData({
        logo_url: settings.site_identity?.logo_url || '',
        favicon_url: settings.site_identity?.favicon_url || '',
        site_title: settings.site_identity?.site_title || 'Yarl Samayal',
        site_tagline: settings.site_identity?.site_tagline || '',
        meta_description: settings.site_identity?.meta_description || '',

        store_contact_email: settings.store_contact_email || '',
        store_contact_phone: settings.store_contact_phone || '',
      })
    }
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setErrorMsg(null)
    try {
      const res = await uploadImageToCloudinary(file, 'settings')
      if (res.url) {
        setFormData((prev) => ({ ...prev, logo_url: res.url! }))
        setSuccessMsg('Logo uploaded successfully.')
      } else {
        setErrorMsg(res.error || 'Failed to upload logo.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Logo upload failed.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFavicon(true)
    setErrorMsg(null)
    try {
      const res = await uploadImageToCloudinary(file, 'settings')
      if (res.url) {
        setFormData((prev) => ({ ...prev, favicon_url: res.url! }))
        setSuccessMsg('Favicon uploaded successfully.')
      } else {
        setErrorMsg(res.error || 'Failed to upload favicon.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Favicon upload failed.')
    } finally {
      setUploadingFavicon(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const siteIdentityObj = {
        logo_url: formData.logo_url.trim(),
        favicon_url: formData.favicon_url.trim(),
        site_title: formData.site_title.trim() || 'Yarl Samayal',
        site_tagline: formData.site_tagline.trim(),
        meta_description: formData.meta_description.trim(),
      }

      const ok1 = await updateSetting('site_identity', siteIdentityObj)
      const ok2 = await updateSetting('store_contact_email', { value: formData.store_contact_email.trim() })
      const ok3 = await updateSetting('store_contact_phone', { value: formData.store_contact_phone.trim() })

      if (ok1 && ok2 && ok3) {
        setSuccessMsg('General settings & site identity saved successfully.')
      } else {
        setErrorMsg('Failed to save some settings. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving general settings.')
    } finally {
      setIsSaving(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading general settings...
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Site Identity */}
        <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
          <div className="border-b border-[#E7ECE8] pb-3">
            <h2 className="text-base font-semibold text-[#1C2521]">Site Identity</h2>
            <p className="text-xs text-[#6B7570]">
              Configure branding assets, site title, tagline, favicon, and SEO meta description.
            </p>
          </div>

          <div className="space-y-5">
            {/* Main Brand Logo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#1C2521]">
                Main Brand Logo (SiteHeader & SiteFooter)
              </label>

              {formData.logo_url?.trim() ? (
                <div className="mb-2 p-3 border border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] inline-block">
                  <span className="text-[10px] text-[#6B7570] block mb-1 font-medium">Current Logo Preview:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.logo_url}
                    alt="Main logo preview"
                    className="h-10 w-auto object-contain max-w-[240px]"
                  />
                </div>
              ) : (
                <div className="mb-2 p-2.5 border border-dashed border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] text-[11px] text-[#6B7570]">
                  No logo uploaded yet. (Falls back to standard text brand header or /public/logo.png)
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Input
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleChange}
                  placeholder="e.g. https://res.cloudinary.com/... or /logo.png"
                  disabled={isSaving || uploadingLogo}
                  className="flex-1"
                />

                <div className="shrink-0">
                  <label className="inline-flex items-center px-3 py-2 border border-[#E7ECE8] text-xs font-medium rounded-sm text-[#1C2521] bg-[#F4F6F4] hover:bg-[#E7ECE8] cursor-pointer transition-colors">
                    {uploadingLogo ? <Spinner size="sm" className="mr-1.5" /> : '📁 Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isSaving || uploadingLogo}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-2 pt-2 border-t border-[#E7ECE8]/60">
              <label className="block text-xs font-medium text-[#1C2521]">
                Site Favicon / Browser Icon
              </label>

              {formData.favicon_url?.trim() ? (
                <div className="mb-2 p-3 border border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] inline-flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.favicon_url}
                    alt="Favicon preview"
                    className="h-8 w-8 object-contain rounded-[2px] border border-[#E7ECE8] bg-white"
                  />
                  <div>
                    <span className="text-[10px] text-[#6B7570] block font-medium">Favicon Preview (32×32)</span>
                    <span className="text-[10px] text-[#2F6B3C] font-mono truncate max-w-[200px] block">
                      {formData.favicon_url}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-2 p-2.5 border border-dashed border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] text-[11px] text-[#6B7570]">
                  No custom favicon uploaded. (Uses standard static /favicon.ico)
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Input
                  name="favicon_url"
                  value={formData.favicon_url}
                  onChange={handleChange}
                  placeholder="e.g. https://res.cloudinary.com/.../favicon.png"
                  disabled={isSaving || uploadingFavicon}
                  className="flex-1"
                />

                <div className="shrink-0">
                  <label className="inline-flex items-center px-3 py-2 border border-[#E7ECE8] text-xs font-medium rounded-sm text-[#1C2521] bg-[#F4F6F4] hover:bg-[#E7ECE8] cursor-pointer transition-colors">
                    {uploadingFavicon ? <Spinner size="sm" className="mr-1.5" /> : '📁 Upload Favicon'}
                    <input
                      type="file"
                      accept="image/*,.ico"
                      onChange={handleFaviconUpload}
                      disabled={isSaving || uploadingFavicon}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-[#6B7570] italic">
                Tip: Favicons work best as a simple square icon (e.g. 32×32 or 64×64 PNG/ICO without full brand wordmark).
              </p>
            </div>

            {/* Site Title & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7ECE8]/60">
              <Input
                label="Site Title"
                name="site_title"
                value={formData.site_title}
                onChange={handleChange}
                placeholder="e.g. Yarl Samayal"
                disabled={isSaving}
                helperText="Primary brand name used for document title and header logo fallback."
              />

              <Input
                label="Site Tagline"
                name="site_tagline"
                value={formData.site_tagline}
                onChange={handleChange}
                placeholder="e.g. Authentic Jaffna Spices & Snacks"
                disabled={isSaving}
                helperText="Short line appended in title context if provided."
              />
            </div>

            {/* SEO Meta Description */}
            <div className="pt-2 border-t border-[#E7ECE8]/60">
              <label className="block text-xs font-medium text-[#1C2521] mb-1">
                SEO Meta Description
              </label>
              <textarea
                name="meta_description"
                rows={3}
                value={formData.meta_description}
                onChange={handleChange}
                placeholder="Default description used for search engine indexing and social sharing cards..."
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] bg-white"
              />
              <p className="mt-1 text-[11px] text-[#6B7570]">
                Applies site-wide unless a specific page (e.g. product or category detail) provides its own description.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: General Contact Info */}
        <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
          <div className="border-b border-[#E7ECE8] pb-3">
            <h2 className="text-base font-semibold text-[#1C2521]">Store Contact Details</h2>
            <p className="text-xs text-[#6B7570]">
              Store contact details used for customer support communications and order notification emails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Store Contact Email"
              name="store_contact_email"
              type="email"
              value={formData.store_contact_email}
              onChange={handleChange}
              placeholder="e.g. support@yarlsamayal.com"
              disabled={isSaving}
            />

            <Input
              label="Store Contact Phone"
              name="store_contact_phone"
              type="tel"
              value={formData.store_contact_phone}
              onChange={handleChange}
              placeholder="e.g. +94 77 123 4567"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-[#E7ECE8]">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || uploadingLogo || uploadingFavicon}
            >
              Save General Settings
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}
