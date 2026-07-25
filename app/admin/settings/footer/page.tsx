'use client'

import React, { useState, useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'
import { SiteFooterUI } from '@/components/organisms/SiteFooterUI'
import {
  PublishedLegalPageItem,
  FooterLayoutColumn,
  FooterContentType,
  DEFAULT_FOOTER_LAYOUT,
  FooterLayoutSetting,
} from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'
import { uploadImageToCloudinary } from '@/lib/cloudinary/upload'

const CONTENT_TYPE_OPTIONS: Array<{ value: FooterContentType; label: string }> = [
  { value: 'about', label: 'About Block (Logo, Tagline, Description)' },
  { value: 'shop_menu', label: 'Shop Menu (Categories / Navigation)' },
  { value: 'legal', label: 'Legal & Policies (Published Pages)' },
  { value: 'contact', label: 'Contact Us & Social Links' },
]

const CONTENT_TYPE_LABELS: Record<FooterContentType, string> = {
  about: 'About',
  shop_menu: 'Shop Menu',
  legal: 'Legal & Policies',
  contact: 'Contact Us',
}

export default function FooterSettingsPage() {
  const { settings, loading: contextLoading, updateSetting } = useSettings()

  const [columns, setColumns] = useState<FooterLayoutColumn[]>(DEFAULT_FOOTER_LAYOUT.columns)

  const [formData, setFormData] = useState({
    footer_logo_url: '',
    footer_tagline: '',
    footer_description: '',

    footer_contact_email: '',
    footer_contact_phone: '',
    footer_contact_whatsapp: '',
    footer_contact_address: '',

    footer_social_facebook: '',
    footer_social_instagram: '',
    footer_social_tiktok: '',
    footer_social_youtube: '',

    footer_copyright_text: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [publishedLegalPages, setPublishedLegalPages] = useState<PublishedLegalPageItem[]>([])

  useEffect(() => {
    if (settings) {
      setFormData({
        footer_logo_url: settings.footer_about?.logo_url || '',
        footer_tagline: settings.footer_about?.tagline || '',
        footer_description: settings.footer_about?.description || '',

        footer_contact_email: settings.footer_contact?.email || '',
        footer_contact_phone: settings.footer_contact?.phone || '',
        footer_contact_whatsapp: settings.footer_contact?.whatsapp || '',
        footer_contact_address: settings.footer_contact?.address || '',

        footer_social_facebook: settings.footer_social?.facebook || '',
        footer_social_instagram: settings.footer_social?.instagram || '',
        footer_social_tiktok: settings.footer_social?.tiktok || '',
        footer_social_youtube: settings.footer_social?.youtube || '',

        footer_copyright_text: settings.footer_copyright?.text || '© {year} Yarl Samayal. All rights reserved.',
      })

      if (settings.footer_layout?.columns && settings.footer_layout.columns.length > 0) {
        setColumns(settings.footer_layout.columns)
      } else {
        setColumns(DEFAULT_FOOTER_LAYOUT.columns)
      }
    }
  }, [settings])

  useEffect(() => {
    const fetchLegalPages = async () => {
      try {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const supabase = createClient() as any
        const { data, error } = await supabase
          .from('legal_pages')
          .select('id, title, slug')
          .eq('is_published', true)
          .order('title', { ascending: true })

        if (!error && data) {
          setPublishedLegalPages(data)
        }
      } catch (err) {
        console.warn('Failed to load legal pages for footer preview:', err)
      }
    }
    fetchLegalPages()
  }, [])

  const totalWidth = columns.reduce((sum, col) => sum + (Number(col.width_percent) || 0), 0)
  const isValidTotal = totalWidth === 100

  const typeCounts = columns.reduce((acc, col) => {
    acc[col.content_type] = (acc[col.content_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const duplicates = Object.entries(typeCounts)
    .filter(([_, count]) => count > 1)
    .map(([type]) => type as FooterContentType)

  const handleColumnTypeChange = (index: number, newType: FooterContentType) => {
    setColumns((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], content_type: newType }
      return copy
    })
  }

  const handleColumnWidthChange = (index: number, newWidth: number) => {
    setColumns((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], width_percent: newWidth }
      return copy
    })
  }

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= columns.length) return
    setColumns((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return copy
    })
  }

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return
    setColumns((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleAddColumn = () => {
    if (columns.length >= 4) return
    const usedTypes = new Set(columns.map((c) => c.content_type))
    const available = CONTENT_TYPE_OPTIONS.find((opt) => !usedTypes.has(opt.value))
    const nextType: FooterContentType = available ? available.value : 'about'

    const remainingPercent = 100 - totalWidth
    const defaultWidth = remainingPercent > 0 ? remainingPercent : 25

    setColumns((prev) => [...prev, { content_type: nextType, width_percent: defaultWidth }])
  }

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
        setFormData((prev) => ({ ...prev, footer_logo_url: res.url! }))
        setSuccessMsg('Footer logo uploaded successfully.')
      } else {
        setErrorMsg(res.error || 'Failed to upload logo.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Logo upload failed.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    if (!isValidTotal) {
      setErrorMsg(`Columns total ${totalWidth}% — must equal 100%`)
      setIsSaving(false)
      return
    }

    try {
      const layoutObj: FooterLayoutSetting = {
        columns: columns.map((c) => ({
          content_type: c.content_type,
          width_percent: Number(c.width_percent) || 0,
        })),
      }

      const aboutObj = {
        logo_url: formData.footer_logo_url.trim(),
        tagline: formData.footer_tagline.trim(),
        description: formData.footer_description.trim(),
      }

      const contactObj = {
        email: formData.footer_contact_email.trim(),
        phone: formData.footer_contact_phone.trim(),
        whatsapp: formData.footer_contact_whatsapp.trim(),
        address: formData.footer_contact_address.trim(),
      }

      const socialObj = {
        facebook: formData.footer_social_facebook.trim(),
        instagram: formData.footer_social_instagram.trim(),
        tiktok: formData.footer_social_tiktok.trim(),
        youtube: formData.footer_social_youtube.trim(),
      }

      const copyrightObj = {
        text: formData.footer_copyright_text.trim() || '© {year} Yarl Samayal. All rights reserved.',
      }

      const ok1 = await updateSetting('footer_layout', layoutObj)
      const ok2 = await updateSetting('footer_about', aboutObj)
      const ok3 = await updateSetting('footer_contact', contactObj)
      const ok4 = await updateSetting('footer_social', socialObj)
      const ok5 = await updateSetting('footer_copyright', copyrightObj)

      if (ok1 && ok2 && ok3 && ok4 && ok5) {
        setSuccessMsg('Footer settings saved successfully.')
      } else {
        setErrorMsg('Failed to save some footer settings. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving footer settings.')
    } finally {
      setIsSaving(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading footer settings...
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
          <h2 className="text-base font-semibold text-[#1C2521]">Footer Settings</h2>
          <p className="text-xs text-[#6B7570]">
            Configure SiteFooter column structure, widths, contact details, social media links, logo, and copyright statement.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Sub-group 1: Footer Layout Configuration */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7ECE8] pb-1 gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3C]">
                1. Footer Layout (Columns & Widths)
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`font-semibold px-2 py-0.5 rounded-xs ${
                    isValidTotal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isValidTotal
                    ? 'Total: 100% ✓'
                    : totalWidth < 100
                    ? `Total: ${totalWidth}% — add ${100 - totalWidth}% more`
                    : `Total: ${totalWidth}% — reduce by ${totalWidth - 100}%`}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#6B7570]">
              Choose between 1 and 4 columns, select which content block appears in each, and assign percentage widths. Total widths must equal exactly 100%.
            </p>

            {duplicates.length > 0 && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  Warning: Content type{duplicates.length > 1 ? 's' : ''}{' '}
                  <strong>
                    {duplicates.map((d) => CONTENT_TYPE_LABELS[d] || d).join(', ')}
                  </strong>{' '}
                  {duplicates.length > 1 ? 'are' : 'is'} used in more than one column.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 border border-[#E7ECE8] rounded-sm bg-[#F4F6F4]/50"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-[#1C2521] w-12">Col {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(idx, 'up')}
                        disabled={idx === 0 || isSaving}
                        className="px-1.5 py-0.5 text-xs bg-white border border-[#E7ECE8] hover:bg-[#E7ECE8] disabled:opacity-30 rounded-xs cursor-pointer font-bold"
                        title="Move left / up"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(idx, 'down')}
                        disabled={idx === columns.length - 1 || isSaving}
                        className="px-1.5 py-0.5 text-xs bg-white border border-[#E7ECE8] hover:bg-[#E7ECE8] disabled:opacity-30 rounded-xs cursor-pointer font-bold"
                        title="Move right / down"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-[#6B7570] mb-0.5">
                      Content Type
                    </label>
                    <select
                      value={col.content_type}
                      onChange={(e) => handleColumnTypeChange(idx, e.target.value as FooterContentType)}
                      disabled={isSaving}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E7ECE8] rounded-sm bg-white focus:outline-none focus:border-[#2F6B3C] text-[#1C2521]"
                    >
                      {CONTENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28 shrink-0">
                    <label className="block text-[11px] font-medium text-[#6B7570] mb-0.5">
                      Width %
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={col.width_percent}
                        onChange={(e) => handleColumnWidthChange(idx, parseInt(e.target.value, 10) || 0)}
                        disabled={isSaving}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#E7ECE8] rounded-sm bg-white focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] pr-6"
                      />
                      <span className="absolute right-2 text-xs text-[#6B7570] pointer-events-none">%</span>
                    </div>
                  </div>

                  <div className="flex items-end shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(idx)}
                      disabled={columns.length <= 1 || isSaving}
                      className="px-2.5 py-1.5 text-xs text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-sm cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {columns.length < 4 && (
              <button
                type="button"
                onClick={handleAddColumn}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#2F6B3C] text-xs font-medium rounded-sm text-[#2F6B3C] bg-white hover:bg-[#F4F6F4] cursor-pointer transition-colors"
              >
                + Add Column ({4 - columns.length} remaining)
              </button>
            )}
          </div>

          {/* Sub-group 2: About Column Content */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3C] border-b border-[#E7ECE8] pb-1">
              2. About Content (Logo, Tagline, Description)
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#1C2521]">
                Footer Logo (Cloudinary Upload or Custom URL)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Input
                  name="footer_logo_url"
                  value={formData.footer_logo_url}
                  onChange={handleChange}
                  placeholder="e.g. https://res.cloudinary.com/... or /logo.png"
                  helperText="Leave empty to display default brand header."
                  disabled={isSaving || uploadingLogo}
                  className="flex-1"
                />

                <div className="shrink-0 pt-0 sm:pt-1">
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

              {formData.footer_logo_url?.trim() && (
                <div className="mt-2 p-2 border border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] inline-block">
                  <span className="text-[10px] text-[#6B7570] block mb-1">Logo Preview:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.footer_logo_url}
                    alt="Footer logo preview"
                    className="h-8 w-auto object-contain"
                  />
                </div>
              )}
            </div>

            <Input
              label="Footer Tagline"
              name="footer_tagline"
              value={formData.footer_tagline}
              onChange={handleChange}
              placeholder="e.g. Authentic Jaffna Spices & Regional Specialties"
              disabled={isSaving}
            />

            <div>
              <label className="block text-xs font-medium text-[#1C2521] mb-1">
                Footer Description
              </label>
              <textarea
                name="footer_description"
                rows={2}
                value={formData.footer_description}
                onChange={handleChange}
                placeholder="Short description displayed in footer Column 1..."
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] bg-white"
              />
            </div>
          </div>

          {/* Sub-group 3: Contact Column Content */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3C] border-b border-[#E7ECE8] pb-1">
              3. Contact Info Content
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Footer Email"
                name="footer_contact_email"
                type="email"
                value={formData.footer_contact_email}
                onChange={handleChange}
                placeholder="e.g. info@yarlsamayal.com"
                disabled={isSaving}
              />

              <Input
                label="Footer Phone"
                name="footer_contact_phone"
                type="tel"
                value={formData.footer_contact_phone}
                onChange={handleChange}
                placeholder="e.g. +94 77 123 4567"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Footer WhatsApp"
                name="footer_contact_whatsapp"
                type="tel"
                value={formData.footer_contact_whatsapp}
                onChange={handleChange}
                placeholder="e.g. +94 77 123 4567"
                disabled={isSaving}
              />

              <Input
                label="Footer Physical Address"
                name="footer_contact_address"
                value={formData.footer_contact_address}
                onChange={handleChange}
                placeholder="e.g. Main Street, Jaffna, Sri Lanka"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Sub-group 4: Social Links Content */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3C] border-b border-[#E7ECE8] pb-1">
              4. Social Links Content
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Facebook URL"
                name="footer_social_facebook"
                value={formData.footer_social_facebook}
                onChange={handleChange}
                placeholder="e.g. https://facebook.com/yarlsamayal"
                disabled={isSaving}
              />

              <Input
                label="Instagram URL"
                name="footer_social_instagram"
                value={formData.footer_social_instagram}
                onChange={handleChange}
                placeholder="e.g. https://instagram.com/yarlsamayal"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="TikTok URL"
                name="footer_social_tiktok"
                value={formData.footer_social_tiktok}
                onChange={handleChange}
                placeholder="e.g. https://tiktok.com/@yarlsamayal"
                disabled={isSaving}
              />

              <Input
                label="YouTube URL"
                name="footer_social_youtube"
                value={formData.footer_social_youtube}
                onChange={handleChange}
                placeholder="e.g. https://youtube.com/@yarlsamayal"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Sub-group 5: Copyright Text */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3C] border-b border-[#E7ECE8] pb-1">
              5. Bottom Bar: Copyright Text
            </h3>

            <Input
              label="Copyright Template Text"
              name="footer_copyright_text"
              value={formData.footer_copyright_text}
              onChange={handleChange}
              placeholder="© {year} Yarl Samayal. All rights reserved."
              helperText="Use {year} placeholder to automatically insert current year."
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E7ECE8]">
            <div>
              {!isValidTotal && (
                <span className="text-xs text-red-600 font-medium">
                  Columns total {totalWidth}% — must equal 100% to save.
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || uploadingLogo || !isValidTotal}
            >
              Save Footer Settings
            </Button>
          </div>
        </form>

        {/* Real-time Footer Preview */}
        <div className="mt-8 pt-6 border-t border-[#E7ECE8] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7570]">
              Live Footer Preview
            </h3>
            <span className="text-[11px] text-[#2F6B3C] font-medium">
              Updates in real-time as you edit
            </span>
          </div>

          <div className="border border-[#E7ECE8] rounded-[4px] overflow-hidden bg-white shadow-xs">
            <SiteFooterUI
              footerAbout={{
                logo_url: formData.footer_logo_url,
                tagline: formData.footer_tagline,
                description: formData.footer_description,
              }}
              footerContact={{
                email: formData.footer_contact_email,
                phone: formData.footer_contact_phone,
                whatsapp: formData.footer_contact_whatsapp,
                address: formData.footer_contact_address,
              }}
              footerSocial={{
                facebook: formData.footer_social_facebook,
                instagram: formData.footer_social_instagram,
                tiktok: formData.footer_social_tiktok,
                youtube: formData.footer_social_youtube,
              }}
              footerCopyright={{
                text: formData.footer_copyright_text,
              }}
              footerLayout={{
                columns,
              }}
              legalPages={publishedLegalPages}
              isPreview={true}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
