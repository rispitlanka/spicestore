'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/context/SettingsContext'
import { HeroSlide } from '@/types/database'
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '@/lib/cloudinary/upload'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

export default function HeroSliderSettingsPage() {
  const { settings, loading: settingsLoading, updateSetting } = useSettings()

  // Height Controls state
  const [heightDesktop, setHeightDesktop] = useState(400)
  const [heightMobile, setHeightMobile] = useState(220)
  const [isSavingHeight, setIsSavingHeight] = useState(false)

  // Slides state
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loadingSlides, setLoadingSlides] = useState(true)
  const [isSavingSlides, setIsSavingSlides] = useState(false)

  // Add Slide Form state
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newPublicId, setNewPublicId] = useState<string | null>(null)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newIsActive, setNewIsActive] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize Height controls from settings context
  useEffect(() => {
    if (settings?.hero_slider_config) {
      setHeightDesktop(settings.hero_slider_config.height_desktop_px || 400)
      setHeightMobile(settings.hero_slider_config.height_mobile_px || 220)
    }
  }, [settings])

  // Load slides data
  const loadSlides = useCallback(async () => {
    try {
      setLoadingSlides(true)
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const supabase = createClient() as any

      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!error && data && Array.isArray(data) && data.length > 0) {
        setSlides(data as HeroSlide[])
      } else {
        // Fallback check in settings table if DB table is empty or error
        const { data: settingRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'hero_slides')
          .maybeSingle()

        if (settingRow && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
          setSlides(settingRow.value as HeroSlide[])
        } else if (!error && data && Array.isArray(data)) {
          setSlides(data as HeroSlide[])
        } else {
          setSlides([])
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load hero slides:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load slides.')
    } finally {
      setLoadingSlides(false)
    }
  }, [])

  useEffect(() => {
    void loadSlides()
  }, [loadSlides])

  // Helper to count active slides
  const activeSlidesCount = slides.filter((s) => s.is_active).length
  const MAX_ACTIVE_SLIDES = 5

  // Persist updated slides list to DB & fallback settings
  const persistSlidesList = async (updatedList: HeroSlide[]) => {
    setIsSavingSlides(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // Re-index sort_order
      const normalized = updatedList.map((item, idx) => ({
        ...item,
        sort_order: idx,
      }))

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const supabase = createClient() as any

      let tableSuccess = false
      try {
        const { error: delErr } = await supabase.from('hero_slides').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        if (!delErr) {
          const rowsToInsert = normalized.map((s) => ({
            id: s.id.startsWith('temp-') ? undefined : s.id,
            image_url: s.image_url,
            cloudinary_public_id: s.cloudinary_public_id || null,
            link_url: s.link_url || null,
            sort_order: s.sort_order,
            is_active: s.is_active,
          }))

          const { error: insErr } = await supabase.from('hero_slides').insert(rowsToInsert)
          if (!insErr) tableSuccess = true
        }
      } catch {
        // Table fallback
      }

      // Sync settings fallback
      const settingsSuccess = await updateSetting('hero_slides', normalized)

      if (tableSuccess || settingsSuccess) {
        setSuccessMsg('Homepage slider slides saved successfully.')
        await loadSlides()
      } else {
        setErrorMsg('Failed to save slides list. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving slides.')
    } finally {
      setIsSavingSlides(false)
    }
  }

  // Save Height Settings
  const handleSaveHeight = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingHeight(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const desktopPx = Math.max(100, Math.min(1000, Number(heightDesktop) || 400))
    const mobilePx = Math.max(100, Math.min(600, Number(heightMobile) || 220))

    try {
      const ok = await updateSetting('hero_slider_config', {
        height_desktop_px: desktopPx,
        height_mobile_px: mobilePx,
      })

      if (ok) {
        setSuccessMsg('Slider height settings updated successfully.')
      } else {
        setErrorMsg('Failed to update height settings.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving height settings.')
    } finally {
      setIsSavingHeight(false)
    }
  }

  // Cloudinary image upload for Add Slide form
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setErrorMsg(null)
    try {
      const res = await uploadImageToCloudinary(file, 'hero-slides')
      if (res.url) {
        setNewImageUrl(res.url)
        setNewPublicId(res.public_id)
        setSuccessMsg('Slide image uploaded successfully.')
      } else {
        setErrorMsg(res.error || 'Failed to upload slide image.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Image upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  // Add Slide submit
  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newImageUrl.trim()) {
      setErrorMsg('Slide image URL is required.')
      return
    }

    if (newIsActive && activeSlidesCount >= MAX_ACTIVE_SLIDES) {
      setErrorMsg(`Maximum ${MAX_ACTIVE_SLIDES} active slides allowed. Deactivate an existing slide first.`)
      return
    }

    const newSlide: HeroSlide = {
      id: `temp-${crypto.randomUUID()}`,
      image_url: newImageUrl.trim(),
      cloudinary_public_id: newPublicId,
      link_url: newLinkUrl.trim() || null,
      sort_order: slides.length,
      is_active: newIsActive,
      created_at: new Date().toISOString(),
    }

    const updated = [...slides, newSlide]
    await persistSlidesList(updated)

    // Reset add form
    setNewImageUrl('')
    setNewPublicId(null)
    setNewLinkUrl('')
    setNewIsActive(true)
  }

  // Move slide up/down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= slides.length) return

    const copy = [...slides]
    const temp = copy[index]
    copy[index] = copy[targetIdx]
    copy[targetIdx] = temp

    await persistSlidesList(copy)
  }

  // Toggle active status for slide
  const handleToggleActive = async (index: number) => {
    const copy = [...slides]
    const currentStatus = copy[index].is_active

    // If activating and already at limit
    if (!currentStatus && activeSlidesCount >= MAX_ACTIVE_SLIDES) {
      setErrorMsg(`Cannot activate more than ${MAX_ACTIVE_SLIDES} active slides at once.`)
      return
    }

    copy[index].is_active = !currentStatus
    await persistSlidesList(copy)
  }

  // Delete slide
  const handleDeleteSlide = async (slide: HeroSlide) => {
    if (!confirm('Are you sure you want to delete this slide?')) return

    if (slide.cloudinary_public_id) {
      try {
        await deleteImageFromCloudinary(slide.cloudinary_public_id)
      } catch (e) {
        console.warn('Could not delete Cloudinary asset:', e)
      }
    }

    const filtered = slides.filter((s) => s.id !== slide.id)
    await persistSlidesList(filtered)
  }

  if (settingsLoading || loadingSlides) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading Homepage Slider settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Messages */}
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

      {/* Section 1: Slider Height Configuration */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3">
          <h2 className="text-base font-semibold text-[#1C2521]">Slider Height Dimensions</h2>
          <p className="text-xs text-[#6B7570]">
            Set the display height of the homepage hero slider for desktop and mobile viewports.
          </p>
        </div>

        <form onSubmit={handleSaveHeight} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Desktop height (px)"
              name="heightDesktop"
              type="number"
              min={100}
              max={1000}
              value={heightDesktop}
              onChange={(e) => setHeightDesktop(Number(e.target.value))}
              placeholder="e.g. 400"
              disabled={isSavingHeight}
              required
              helperText="Default: 400px"
            />

            <Input
              label="Mobile height (px)"
              name="heightMobile"
              type="number"
              min={100}
              max={600}
              value={heightMobile}
              onChange={(e) => setHeightMobile(Number(e.target.value))}
              placeholder="e.g. 220"
              disabled={isSavingHeight}
              required
              helperText="Default: 220px"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingHeight}
              disabled={isSavingHeight}
            >
              Save Height Settings
            </Button>
          </div>
        </form>
      </section>

      {/* Section 2: Current Slides List */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1C2521]">Homepage Hero Slides</h2>
            <p className="text-xs text-[#6B7570]">
              Manage hero images, click link URLs, visibility status, and slide order. Maximum 5 active slides.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#2F6B3C]">
            {activeSlidesCount} / {MAX_ACTIVE_SLIDES} Active Slides
          </span>
        </div>

        {slides.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E7ECE8] rounded-sm text-xs text-[#6B7570]">
            No slides created yet. Use the form below to add your first homepage slide!
          </div>
        ) : (
          <div className="divide-y divide-[#E7ECE8] border border-[#E7ECE8] rounded-sm bg-white overflow-hidden">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !slide.is_active ? 'bg-gray-50/70 opacity-75' : 'hover:bg-[#F4F6F4]/40'
                }`}
              >
                {/* Thumbnail & Information */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Position Buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0 || isSavingSlides}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 text-xs text-[#6B7570] hover:text-[#1C2521] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === slides.length - 1 || isSavingSlides}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 text-xs text-[#6B7570] hover:text-[#1C2521] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>

                  <span className="font-semibold text-xs text-[#6B7570] w-5 shrink-0 text-center">
                    #{idx + 1}
                  </span>

                  {/* Thumbnail Image Preview */}
                  <div className="w-20 h-12 bg-gray-100 border border-[#E7ECE8] rounded-[3px] overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image_url}
                      alt={`Slide #${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Link URL info */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1C2521] truncate max-w-[300px]">
                        {slide.image_url.split('/').pop()}
                      </span>
                      {!slide.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-gray-200 text-gray-700 rounded-[2px]">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7570] truncate max-w-[320px]">
                      {slide.link_url ? (
                        <span>🔗 Link: <span className="font-mono text-[#2F6B3C]">{slide.link_url}</span></span>
                      ) : (
                        <span className="italic text-gray-400">No link (non-clickable)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Toggle Active, Delete */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7ECE8]">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(idx)}
                    disabled={isSavingSlides}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                      slide.is_active
                        ? 'border-[#2F6B3C] text-[#2F6B3C] hover:bg-[#2F6B3C]/10'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {slide.is_active ? '👁️ Active' : '🙈 Inactive'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(slide)}
                    disabled={isSavingSlides}
                    className="p-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                    title="Delete Slide"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Add Slide Form */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1C2521]">Add New Slide</h2>
            <p className="text-xs text-[#6B7570]">
              Upload a slide image and configure an optional click destination link.
            </p>
          </div>

          {activeSlidesCount >= MAX_ACTIVE_SLIDES && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-[2px]">
              ⚠️ Active slide limit ({MAX_ACTIVE_SLIDES}) reached. New slides will default to inactive.
            </span>
          )}
        </div>

        <form onSubmit={handleAddSlide} className="space-y-5">
          {/* Image Upload Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#1C2521]">
              Slide Image (Cloudinary Upload or Image URL)
            </label>

            {newImageUrl ? (
              <div className="mb-2 p-3 border border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] inline-block">
                <span className="text-[10px] text-[#6B7570] block mb-1 font-medium">New Image Preview:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={newImageUrl}
                  alt="New slide preview"
                  className="h-24 w-auto object-cover rounded-[2px]"
                />
              </div>
            ) : (
              <div className="mb-2 p-2.5 border border-dashed border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] text-[11px] text-[#6B7570]">
                No image selected yet. Upload an image file or enter a direct image URL below.
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Input
                name="newImageUrl"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="e.g. https://res.cloudinary.com/.../hero1.jpg"
                disabled={isSavingSlides || uploadingImage}
                className="flex-1"
                required
              />

              <div className="shrink-0">
                <label className="inline-flex items-center px-3 py-2 border border-[#E7ECE8] text-xs font-medium rounded-sm text-[#1C2521] bg-[#F4F6F4] hover:bg-[#E7ECE8] cursor-pointer transition-colors">
                  {uploadingImage ? <Spinner size="sm" className="mr-1.5" /> : '📁 Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isSavingSlides || uploadingImage}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Link URL & Active Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Link URL (Optional)"
              name="newLinkUrl"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="e.g. /category/spices or https://..."
              disabled={isSavingSlides}
              helperText="Internal path (e.g. /category/spices) or external URL."
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1C2521]">
                Active Status
              </label>
              <div className="flex items-center gap-3 min-h-[38px]">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#1C2521]">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    disabled={isSavingSlides || (activeSlidesCount >= MAX_ACTIVE_SLIDES && !newIsActive)}
                    className="rounded-xs border-[#E7ECE8] text-[#2F6B3C] focus:ring-[#2F6B3C] w-4 h-4"
                  />
                  <span>Enable slide on homepage (is_active)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingSlides}
              disabled={isSavingSlides || uploadingImage || !newImageUrl.trim()}
            >
              Add Slide
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
