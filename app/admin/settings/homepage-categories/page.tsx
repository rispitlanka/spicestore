'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables, HomepageCategoryWithCategory } from '@/types/database'
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '@/lib/cloudinary/upload'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

export default function HomepageCategoriesSettingsPage() {
  const [showcaseItems, setShowcaseItems] = useState<HomepageCategoryWithCategory[]>([])
  const [allCategories, setAllCategories] = useState<Tables<'categories'>[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Add Form state
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [publicId, setPublicId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load data: full category list + showcase items
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const supabase = createClient() as any

      // 1. Fetch all store categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (catErr) {
        console.error('Error fetching categories:', catErr)
      } else if (catData) {
        setAllCategories(catData as Tables<'categories'>[])
      }

      // 2. Fetch homepage showcase categories from DB table
      const { data: showcaseData, error: showcaseErr } = await supabase
        .from('homepage_categories')
        .select(`
          *,
          categories (id, name, slug, is_active)
        `)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!showcaseErr && showcaseData && Array.isArray(showcaseData) && showcaseData.length > 0) {
        setShowcaseItems(showcaseData as HomepageCategoryWithCategory[])
      } else {
        // Fallback: fetch from settings table if table is empty or doesn't exist
        const { data: settingRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'homepage_categories')
          .maybeSingle()

        if (settingRow && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
          setShowcaseItems(settingRow.value as HomepageCategoryWithCategory[])
        } else {
          setShowcaseItems([])
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load homepage categories data:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load showcase data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Filter available categories for "Add to showcase" (exclude categories already in showcase)
  const configuredCategoryIds = new Set(showcaseItems.map((item) => item.category_id))
  const availableCategories = allCategories.filter((cat) => !configuredCategoryIds.has(cat.id))

  // Persist updated showcase list to DB table & fallback settings
  const persistShowcaseList = async (updatedList: HomepageCategoryWithCategory[]) => {
    setIsSaving(true)
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
        // Try resetting/syncing homepage_categories table
        const { error: delErr } = await supabase
          .from('homepage_categories')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')

        if (!delErr) {
          const rowsToInsert = normalized.map((item) => ({
            id: item.id.startsWith('temp-') ? undefined : item.id,
            category_id: item.category_id,
            image_url: item.image_url,
            cloudinary_public_id: item.cloudinary_public_id || null,
            sort_order: item.sort_order,
            is_active: item.is_active,
          }))

          const { error: insErr } = await supabase.from('homepage_categories').insert(rowsToInsert)
          if (!insErr) tableSuccess = true
        }
      } catch (err) {
        console.warn('Table write fallback:', err)
      }

      // Sync settings table fallback for 100% data safety
      const { error: setErr } = await supabase.from('settings').upsert(
        {
          key: 'homepage_categories',
          value: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

      if (tableSuccess || !setErr) {
        setSuccessMsg('Homepage categories showcase saved successfully.')
        await loadData()
      } else {
        setErrorMsg('Failed to save showcase categories. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving showcase categories.')
    } finally {
      setIsSaving(false)
    }
  }

  // Cloudinary image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setErrorMsg(null)
    try {
      const res = await uploadImageToCloudinary(file, 'homepage-categories')
      if (res.url) {
        setImageUrl(res.url)
        setPublicId(res.public_id)
        setSuccessMsg('Showcase image uploaded successfully.')
      } else {
        setErrorMsg(res.error || 'Failed to upload showcase image.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Image upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  // Add Category to Showcase submit
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCategoryId) {
      setErrorMsg('Please select a category.')
      return
    }

    if (!imageUrl.trim()) {
      setErrorMsg('Showcase image is required.')
      return
    }

    const matchedCat = allCategories.find((c) => c.id === selectedCategoryId)

    const newItem: HomepageCategoryWithCategory = {
      id: `temp-${crypto.randomUUID()}`,
      category_id: selectedCategoryId,
      image_url: imageUrl.trim(),
      cloudinary_public_id: publicId,
      sort_order: showcaseItems.length,
      is_active: isActive,
      created_at: new Date().toISOString(),
      categories: matchedCat
        ? {
            id: matchedCat.id,
            name: matchedCat.name,
            slug: matchedCat.slug,
            is_active: matchedCat.is_active,
          }
        : null,
    }

    const updated = [...showcaseItems, newItem]
    await persistShowcaseList(updated)

    // Reset form fields
    setSelectedCategoryId('')
    setImageUrl('')
    setPublicId(null)
    setIsActive(true)
  }

  // Reorder showcase item (move up / down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= showcaseItems.length) return

    const copy = [...showcaseItems]
    const temp = copy[index]
    copy[index] = copy[targetIdx]
    copy[targetIdx] = temp

    await persistShowcaseList(copy)
  }

  // Toggle active status
  const handleToggleActive = async (index: number) => {
    const copy = [...showcaseItems]
    copy[index].is_active = !copy[index].is_active
    await persistShowcaseList(copy)
  }

  // Delete category from showcase
  const handleDeleteCategory = async (item: HomepageCategoryWithCategory) => {
    const catName = item.categories?.name || 'this category'
    if (!confirm(`Are you sure you want to remove ${catName} from the homepage showcase?`)) return

    if (item.cloudinary_public_id) {
      try {
        await deleteImageFromCloudinary(item.cloudinary_public_id)
      } catch (e) {
        console.warn('Could not delete Cloudinary asset:', e)
      }
    }

    const filtered = showcaseItems.filter((i) => i.id !== item.id)
    await persistShowcaseList(filtered)
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading Homepage Categories Showcase settings...
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

      {/* Section 1: Configured Showcase Categories List */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1C2521]">Homepage Showcase Categories</h2>
            <p className="text-xs text-[#6B7570]">
              Curate which categories appear in the minimal image showcase on the homepage and set their display order.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#2F6B3C]">
            {showcaseItems.filter((i) => i.is_active).length} Active Showcase Items
          </span>
        </div>

        {showcaseItems.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E7ECE8] rounded-sm text-xs text-[#6B7570] space-y-1">
            <p className="font-medium text-[#1C2521]">No showcase categories configured yet.</p>
            <p>
              The homepage will currently fall back to plain text category tabs. Use the form below to add your first showcase category image tile!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7ECE8] border border-[#E7ECE8] rounded-sm bg-white overflow-hidden">
            {showcaseItems.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !item.is_active ? 'bg-gray-50/70 opacity-75' : 'hover:bg-[#F4F6F4]/40'
                }`}
              >
                {/* Information & Thumbnail */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Position Up/Down Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0 || isSaving}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 text-xs text-[#6B7570] hover:text-[#1C2521] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === showcaseItems.length - 1 || isSaving}
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

                  {/* Showcase Image Thumbnail */}
                  <div className="w-16 h-16 bg-gray-100 border border-[#E7ECE8] rounded-[4px] overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.categories?.name || 'Category thumbnail'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Category Details */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-[#1C2521] truncate">
                        {item.categories?.name || 'Unknown Category'}
                      </h3>
                      {!item.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-gray-200 text-gray-700 rounded-[2px]">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7570] font-mono truncate">
                      Slug: /{item.categories?.slug || 'n-a'}
                    </div>
                  </div>
                </div>

                {/* Actions: Active Toggle, Remove */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7ECE8]">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(idx)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                      item.is_active
                        ? 'border-[#2F6B3C] text-[#2F6B3C] hover:bg-[#2F6B3C]/10'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.is_active ? '👁️ Active' : '🙈 Inactive'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(item)}
                    disabled={isSaving}
                    className="p-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                    title="Remove from Showcase"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Add Category to Showcase Form */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3">
          <h2 className="text-base font-semibold text-[#1C2521]">Add Category to Showcase</h2>
          <p className="text-xs text-[#6B7570]">
            Select a category not yet included in the showcase and upload its dedicated homepage tile image.
          </p>
        </div>

        <form onSubmit={handleAddCategory} className="space-y-5">
          {/* Select Category */}
          <div className="space-y-1.5 max-w-xl">
            <label className="block text-xs font-medium text-[#1C2521]">
              Select Store Category <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={isSaving || availableCategories.length === 0}
              className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm bg-white text-[#1C2521] focus:outline-none focus:ring-1 focus:ring-[#2F6B3C] focus:border-[#2F6B3C]"
              required
            >
              <option value="">-- Choose a category --</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.slug})
                </option>
              ))}
            </select>

            {availableCategories.length === 0 && (
              <p className="text-[11px] text-[#6B7570] italic">
                All store categories have already been added to the homepage showcase!
              </p>
            )}
          </div>

          {/* Image Upload Input */}
          <div className="space-y-2 max-w-xl">
            <label className="block text-xs font-medium text-[#1C2521]">
              Showcase Tile Image <span className="text-red-500">*</span>
            </label>

            {imageUrl ? (
              <div className="mb-2 p-3 border border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] inline-block">
                <span className="text-[10px] text-[#6B7570] block mb-1 font-medium">Image Preview:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Showcase preview"
                  className="h-24 w-24 object-cover rounded-[2px] border border-[#E7ECE8]"
                />
              </div>
            ) : (
              <div className="mb-2 p-2.5 border border-dashed border-[#E7ECE8] rounded-[4px] bg-[#F4F6F4] text-[11px] text-[#6B7570]">
                No showcase tile image selected yet. Upload an image file or provide a Cloudinary image URL below.
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Input
                name="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="e.g. https://res.cloudinary.com/.../category.jpg"
                disabled={isSaving || uploadingImage}
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
                    disabled={isSaving || uploadingImage}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#1C2521]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving}
                className="rounded-xs border-[#E7ECE8] text-[#2F6B3C] focus:ring-[#2F6B3C] w-4 h-4"
              />
              <span>Enable in homepage showcase (is_active)</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || uploadingImage || !selectedCategoryId || !imageUrl.trim()}
            >
              Add Category to Showcase
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
