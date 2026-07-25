'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MenuItem, LinkType, MenuLocation, fetchAllMenuItems } from '@/lib/menu'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'
import { useSettings } from '@/context/SettingsContext'

interface CategoryOption {
  id: string
  name: string
  slug: string
}

interface LegalPageOption {
  id: string
  title: string
  slug: string
}

interface ProductOption {
  id: string
  name: string
  slug: string
}

export default function MenuManagementPage() {
  const { updateSetting } = useSettings()

  const [activeLocation, setActiveLocation] = useState<MenuLocation>('header')
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Target options for pickers
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [legalPages, setLegalPages] = useState<LegalPageOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])

  // Form state for adding/editing items
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formLinkType, setFormLinkType] = useState<LinkType>('category')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formLegalPageSlug, setFormLegalPageSlug] = useState('')
  const [formCustomUrl, setFormCustomUrl] = useState('')
  const [formProductId, setFormProductId] = useState('')

  // Load menu items & options
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const supabase = createClient() as any

      const [items, { data: catData }, { data: legalData }, { data: prodData }] = await Promise.all([
        fetchAllMenuItems(),
        supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('legal_pages').select('id, title, slug').eq('is_published', true).order('title', { ascending: true }),
        supabase.from('products').select('id, name, slug').eq('is_active', true).order('name', { ascending: true }),
      ])

      setAllItems(items)
      if (catData) setCategories(catData)
      if (legalData) setLegalPages(legalData)
      if (prodData) setProducts(prodData)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading menu data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setFormLabel('')
    setFormLinkType('category')
    setFormCategoryId(categories[0]?.id || '')
    setFormLegalPageSlug(legalPages[0]?.slug || '')
    setFormCustomUrl('/')
    setFormProductId(products[0]?.id || '')
  }, [categories, legalPages, products])

  // Reset form when changing active tab
  useEffect(() => {
    resetForm()
  }, [activeLocation, resetForm])

  // Current location items sorted by sort_order
  const currentLocationItems = allItems
    .filter((i) => (i.menu_location || 'header') === activeLocation)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Set default selection when pickers load
  useEffect(() => {
    if (!formCategoryId && categories.length > 0) setFormCategoryId(categories[0].id)
    if (!formLegalPageSlug && legalPages.length > 0) setFormLegalPageSlug(legalPages[0].slug)
    if (!formProductId && products.length > 0) setFormProductId(products[0].id)
  }, [categories, legalPages, products, formCategoryId, formLegalPageSlug, formProductId])

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id)
    setFormLabel(item.label)
    setFormLinkType(item.link_type)
    setFormCategoryId(item.category_id || (categories[0]?.id || ''))
    setFormLegalPageSlug(item.legal_page_slug || (legalPages[0]?.slug || ''))
    setFormCustomUrl(item.custom_url || '/')
    setFormProductId(item.product_id || (products[0]?.id || ''))
  }

  const persistLocationItems = async (updatedLocationList: MenuItem[]) => {
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const supabase = createClient() as any

      // Normalize sort_order for current location
      const sortedForLocation = updatedLocationList.map((item, idx) => ({
        ...item,
        sort_order: idx,
        menu_location: activeLocation,
      }))

      // Combine with other location items
      const otherLocationItems = allItems.filter((i) => (i.menu_location || 'header') !== activeLocation)
      const newCombined = [...otherLocationItems, ...sortedForLocation]

      setAllItems(newCombined)

      // 1. Try persisting to menu_items table for current location
      let tableSuccess = false
      try {
        const { error: delErr } = await supabase
          .from('menu_items')
          .delete()
          .eq('menu_location', activeLocation)

        if (!delErr) {
          const rowsToInsert = sortedForLocation.map((i) => ({
            label: i.label,
            link_type: i.link_type,
            category_id: i.link_type === 'category' ? i.category_id || null : null,
            legal_page_slug: i.link_type === 'legal_page' ? i.legal_page_slug || null : null,
            custom_url: i.link_type === 'custom_url' ? i.custom_url || null : null,
            product_id: i.link_type === 'product' ? i.product_id || null : null,
            sort_order: i.sort_order,
            is_visible: i.is_visible,
            menu_location: activeLocation,
          }))

          const { error: insErr } = await supabase.from('menu_items').insert(rowsToInsert)
          if (!insErr) tableSuccess = true
        }
      } catch {
        // Silent fallback to settings table if table doesn't exist
      }

      // 2. Persist to settings table key for location and global menu_items fallback
      const settingsLocSuccess = await updateSetting(`menu_items_${activeLocation}`, sortedForLocation)
      const settingsAllSuccess = await updateSetting('menu_items', newCombined)

      if (tableSuccess || settingsLocSuccess || settingsAllSuccess) {
        setSuccessMsg(`${activeLocation === 'header' ? 'Header' : 'Footer Shop'} menu items updated successfully.`)
        resetForm()
        await loadData()
      } else {
        setErrorMsg('Failed to save menu items. Please try again.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving menu items.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formLabel.trim()) {
      setErrorMsg('Menu item label is required.')
      return
    }

    // Validate link target
    let catId: string | null = null
    let legalSlug: string | null = null
    let customUrl: string | null = null
    let prodId: string | null = null

    if (formLinkType === 'category') {
      catId = formCategoryId || null
      if (!catId) {
        setErrorMsg('Please select a valid category.')
        return
      }
    } else if (formLinkType === 'legal_page') {
      legalSlug = formLegalPageSlug || null
      if (!legalSlug) {
        setErrorMsg('Please select a valid legal page.')
        return
      }
    } else if (formLinkType === 'custom_url') {
      customUrl = formCustomUrl.trim() || '/'
    } else if (formLinkType === 'product') {
      prodId = formProductId || null
      if (!prodId) {
        setErrorMsg('Please select a valid product.')
        return
      }
    }

    let newList: MenuItem[] = []

    if (editingId) {
      // Update existing item
      newList = currentLocationItems.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            label: formLabel.trim(),
            link_type: formLinkType,
            category_id: catId,
            legal_page_slug: legalSlug,
            custom_url: customUrl,
            product_id: prodId,
            menu_location: activeLocation,
          }
        }
        return item
      })
    } else {
      // Add new item to current location
      const newItem: MenuItem = {
        id: `temp-${Date.now()}`,
        label: formLabel.trim(),
        link_type: formLinkType,
        category_id: catId,
        legal_page_slug: legalSlug,
        custom_url: customUrl,
        product_id: prodId,
        sort_order: currentLocationItems.length,
        is_visible: true,
        menu_location: activeLocation,
      }
      newList = [...currentLocationItems, newItem]
    }

    await persistLocationItems(newList)
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= currentLocationItems.length) return

    const copy = [...currentLocationItems]
    const temp = copy[index]
    copy[index] = copy[targetIdx]
    copy[targetIdx] = temp

    await persistLocationItems(copy)
  }

  const handleToggleVisible = async (index: number) => {
    const copy = [...currentLocationItems]
    copy[index].is_visible = !copy[index].is_visible
    await persistLocationItems(copy)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    const filtered = currentLocationItems.filter((i) => i.id !== id)
    await persistLocationItems(filtered)
  }

  const renderTargetBadge = (item: MenuItem) => {
    switch (item.link_type) {
      case 'category':
        const cat = categories.find((c) => c.id === item.category_id)
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Category: {cat?.name || item.category_slug || item.category_id}
          </span>
        )
      case 'legal_page':
        const legal = legalPages.find((l) => l.slug === item.legal_page_slug)
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Legal Page: {legal?.title || item.legal_page_slug}
          </span>
        )
      case 'product':
        const prod = products.find((p) => p.id === item.product_id)
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Product: {prod?.name || item.product_slug || item.product_id}
          </span>
        )
      case 'custom_url':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Custom URL: {item.custom_url || '/'}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-xs text-[#6B7570]">
        <Spinner size="sm" className="mr-2" /> Loading menu items...
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Messages */}
      {successMsg && (
        <div className="border border-green-200 bg-green-50 p-4 rounded-sm text-xs text-[#2F6B3C] font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-[#2F6B3C] hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-sm text-xs text-red-700 font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-xs text-red-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Menu Location Selector Tabs */}
      <div className="flex border-b border-[#E7ECE8] space-x-2">
        <button
          type="button"
          onClick={() => setActiveLocation('header')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-sm transition-colors cursor-pointer border-b-2 ${
            activeLocation === 'header'
              ? 'border-[#2F6B3C] text-[#2F6B3C] bg-[#2F6B3C]/5'
              : 'border-transparent text-[#6B7570] hover:text-[#1C2521] hover:bg-[#F4F6F4]'
          }`}
        >
          📍 Header Navigation ({allItems.filter((i) => (i.menu_location || 'header') === 'header').length})
        </button>

        <button
          type="button"
          onClick={() => setActiveLocation('footer_shop')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-sm transition-colors cursor-pointer border-b-2 ${
            activeLocation === 'footer_shop'
              ? 'border-[#2F6B3C] text-[#2F6B3C] bg-[#2F6B3C]/5'
              : 'border-transparent text-[#6B7570] hover:text-[#1C2521] hover:bg-[#F4F6F4]'
          }`}
        >
          📍 Footer Shop Column ({allItems.filter((i) => i.menu_location === 'footer_shop').length})
        </button>
      </div>

      {/* Menu Item Reordering & Management List for Active Location */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1C2521]">
              {activeLocation === 'header' ? 'Header Navigation Items' : "Footer 'Shop' Column Items"}
            </h2>
            <p className="text-xs text-[#6B7570]">
              {activeLocation === 'header'
                ? 'Manage menu links displayed in the main site header navigation.'
                : "Manage category and quick links displayed in the SiteFooter 'Shop' column."}
            </p>
          </div>
          <span className="text-xs text-[#2F6B3C] font-medium">
            {currentLocationItems.length} items in {activeLocation === 'header' ? 'Header' : 'Footer Shop'}
          </span>
        </div>

        {currentLocationItems.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E7ECE8] rounded-sm text-xs text-[#6B7570]">
            No menu items configured for {activeLocation === 'header' ? 'Header Navigation' : 'Footer Shop Column'}. Use the form below to add your first link!
          </div>
        ) : (
          <div className="divide-y divide-[#E7ECE8] border border-[#E7ECE8] rounded-sm bg-white overflow-hidden">
            {currentLocationItems.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  !item.is_visible ? 'bg-gray-50/70 opacity-75' : 'hover:bg-[#F4F6F4]/40'
                }`}
              >
                {/* Item Label & Resolved Badge */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Position Buttons */}
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
                      disabled={idx === currentLocationItems.length - 1 || isSaving}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 text-xs text-[#6B7570] hover:text-[#1C2521] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>

                  <span className="font-semibold text-xs text-[#6B7570] w-6 shrink-0 text-center">
                    #{idx + 1}
                  </span>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1C2521] truncate">
                        {item.label}
                      </span>
                      {!item.is_visible && (
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-gray-200 text-gray-700 rounded-[2px]">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div>{renderTargetBadge(item)}</div>
                  </div>
                </div>

                {/* Controls: Edit, Visibility Toggle, Delete */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7ECE8]">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(item)}
                    disabled={isSaving}
                  >
                    Edit
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleToggleVisible(idx)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                      item.is_visible
                        ? 'border-[#2F6B3C] text-[#2F6B3C] hover:bg-[#2F6B3C]/10'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.is_visible ? '👁️ Visible' : '🙈 Hidden'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={isSaving}
                    className="p-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                    title="Delete Menu Item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Form: Add or Edit Menu Item for Active Location */}
      <section className="border border-[#E7ECE8] rounded-sm p-6 bg-white space-y-6">
        <div className="border-b border-[#E7ECE8] pb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1C2521]">
            {editingId
              ? `Edit ${activeLocation === 'header' ? 'Header' : 'Footer Shop'} Item`
              : `Add New Item to ${activeLocation === 'header' ? 'Header Navigation' : 'Footer Shop Column'}`}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-[#2F6B3C] hover:underline cursor-pointer font-medium"
            >
              + Cancel Edit & Add New
            </button>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Label"
              name="formLabel"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="e.g. Traditional Spices"
              disabled={isSaving}
              required
            />

            <div>
              <label className="block text-xs font-medium text-[#1C2521] mb-1">
                Link Type
              </label>
              <select
                value={formLinkType}
                onChange={(e) => setFormLinkType(e.target.value as LinkType)}
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] bg-white min-h-[38px]"
              >
                <option value="category">Category</option>
                <option value="legal_page">Legal Page</option>
                <option value="custom_url">Custom URL</option>
                <option value="product">Product</option>
              </select>
            </div>
          </div>

          {/* Conditional Target Picker based on Link Type */}
          <div className="p-4 bg-[#F4F6F4]/50 border border-[#E7ECE8] rounded-sm space-y-2">
            <label className="block text-xs font-semibold text-[#1C2521]">
              Target Destination ({formLinkType.replace('_', ' ').toUpperCase()})
            </label>

            {formLinkType === 'category' && (
              <div>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] bg-white min-h-[38px]"
                >
                  {categories.length === 0 ? (
                    <option value="">No active categories found</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (/category/{c.slug})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {formLinkType === 'legal_page' && (
              <div>
                <select
                  value={formLegalPageSlug}
                  onChange={(e) => setFormLegalPageSlug(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] bg-white min-h-[38px]"
                >
                  {legalPages.length === 0 ? (
                    <option value="">No published legal pages found</option>
                  ) : (
                    legalPages.map((l) => (
                      <option key={l.slug} value={l.slug}>
                        {l.title} (/legal/{l.slug})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {formLinkType === 'custom_url' && (
              <Input
                label=""
                name="formCustomUrl"
                value={formCustomUrl}
                onChange={(e) => setFormCustomUrl(e.target.value)}
                placeholder="e.g. / or /products or https://..."
                helperText="Enter internal route starting with / or external absolute URL."
                disabled={isSaving}
              />
            )}

            {formLinkType === 'product' && (
              <div>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs border border-[#E7ECE8] rounded-sm focus:outline-none focus:border-[#2F6B3C] text-[#1C2521] bg-white min-h-[38px]"
                >
                  {products.length === 0 ? (
                    <option value="">No active products found</option>
                  ) : (
                    products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (/products/{p.slug})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving}
            >
              {editingId ? 'Save Item Changes' : `Add Item to ${activeLocation === 'header' ? 'Header' : 'Footer Shop'}`}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
