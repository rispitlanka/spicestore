/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CldUploadWidget } from 'next-cloudinary'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { EmptyState } from '@/components/atoms/EmptyState'

type ProductImage = Tables<'product_images'>
type ProductVariation = Tables<'product_variations'>

interface ProductWithRelations extends Tables<'products'> {
  categories?: Tables<'categories'> | null
  product_images?: ProductImage[]
  product_variations?: ProductVariation[]
}

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)
  const productId = resolvedParams.id

  const [product, setProduct] = useState<ProductWithRelations | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Manual URL Modal/Input per scope
  const [manualUrlScope, setManualUrlScope] = useState<string | null | 'CLOSED'>('CLOSED')
  const [manualUrlInput, setManualUrlInput] = useState('')
  const [manualPublicIdInput, setManualPublicIdInput] = useState('')

  const fetchProductDetails = useCallback(async () => {
    setLoading(true)
    const supabase = createClient() as any

    const [prodRes, imgRes, varRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(*)')
        .eq('id', productId)
        .single(),
      supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', productId)
        .order('sku', { ascending: true }),
    ])

    if (prodRes.error || !prodRes.data) {
      console.error('Error fetching product:', prodRes.error)
      setErrorMessage('Product not found.')
      setLoading(false)
      return
    }

    setProduct(prodRes.data)
    setImages(imgRes.data || [])
    setVariations(varRes.data || [])
    setLoading(false)
  }, [productId])

  useEffect(() => {
    fetchProductDetails()
  }, [fetchProductDetails])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Handle Cloudinary Upload Success for a specific scope (null for product default, or variation_id)
  const handleUploadSuccess = async (result: any, targetVarId: string | null) => {
    if (!result || !result.info) return
    const info = result.info
    const imageUrl = info.secure_url || info.url
    const publicId = info.public_id

    if (!imageUrl) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const supabase = createClient() as any

      // Check if this scope currently has an is_main image
      const scopeImages = images.filter((img) =>
        targetVarId ? img.variation_id === targetVarId : img.variation_id === null
      )
      const hasMainInScope = scopeImages.some((img) => img.is_main)
      const nextSortOrder =
        scopeImages.length > 0
          ? Math.max(...scopeImages.map((i) => i.sort_order ?? 0)) + 1
          : 0

      const newImageRow = {
        product_id: productId,
        url: imageUrl,
        cloudinary_public_id: publicId || null,
        sort_order: nextSortOrder,
        is_main: !hasMainInScope, // Auto-mark main if this scope has no main image yet
        variation_id: targetVarId,
      }

      const { data, error } = await supabase
        .from('product_images')
        .insert(newImageRow)
        .select('*')
        .single()

      if (error) throw error

      setImages((prev) => [...prev, data])
      setSuccessMessage('Cloudinary image uploaded successfully!')
    } catch (err: unknown) {
      console.error('Error saving uploaded image:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save image.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Manual URL Add for a specific scope
  const handleAddManualUrl = async (targetVarId: string | null) => {
    const trimmedUrl = manualUrlInput.trim()
    if (!trimmedUrl) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const supabase = createClient() as any
      const scopeImages = images.filter((img) =>
        targetVarId ? img.variation_id === targetVarId : img.variation_id === null
      )
      const hasMainInScope = scopeImages.some((img) => img.is_main)
      const nextSortOrder =
        scopeImages.length > 0
          ? Math.max(...scopeImages.map((i) => i.sort_order ?? 0)) + 1
          : 0

      const newImageRow = {
        product_id: productId,
        url: trimmedUrl,
        cloudinary_public_id: manualPublicIdInput.trim() || null,
        sort_order: nextSortOrder,
        is_main: !hasMainInScope,
        variation_id: targetVarId,
      }

      const { data, error } = await supabase
        .from('product_images')
        .insert(newImageRow)
        .select('*')
        .single()

      if (error) throw error

      setImages((prev) => [...prev, data])
      setManualUrlInput('')
      setManualPublicIdInput('')
      setManualUrlScope('CLOSED')
      setSuccessMessage('Image added successfully!')
    } catch (err: unknown) {
      console.error('Error adding manual image:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add image.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Setting Main Image (Radio Toggle Scoped to variation_id / product level)
  const handleSetMainImage = async (selectedImg: ProductImage) => {
    setSaving(true)
    setErrorMessage(null)

    const targetVarId = selectedImg.variation_id

    try {
      const supabase = createClient() as any

      // 1. Unset existing main image for this specific scope (matching product_id AND variation_id IS NOT DISTINCT FROM targetVarId)
      if (targetVarId) {
        await supabase
          .from('product_images')
          .update({ is_main: false })
          .eq('product_id', productId)
          .eq('variation_id', targetVarId)
      } else {
        await supabase
          .from('product_images')
          .update({ is_main: false })
          .eq('product_id', productId)
          .is('variation_id', null)
      }

      // 2. Set is_main = true for the selected image
      const { error: updateErr } = await supabase
        .from('product_images')
        .update({ is_main: true })
        .eq('id', selectedImg.id)

      if (updateErr) throw updateErr

      // Update local state
      setImages((prev) =>
        prev.map((img) => {
          const sameScope =
            targetVarId ? img.variation_id === targetVarId : img.variation_id === null
          if (img.id === selectedImg.id) {
            return { ...img, is_main: true }
          }
          if (sameScope) {
            return { ...img, is_main: false }
          }
          return img
        })
      )

      setSuccessMessage('Main thumbnail updated for this section!')
    } catch (err: unknown) {
      console.error('Error setting main image:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to set main image.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Reordering Images within a scope
  const handleMoveImage = async (
    scopeImages: ProductImage[],
    index: number,
    direction: 'left' | 'right'
  ) => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= scopeImages.length) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const reordered = [...scopeImages]
      const temp = reordered[index]
      reordered[index] = reordered[targetIndex]
      reordered[targetIndex] = temp

      // Update sort_order values sequentially for this scope
      const updatedScope = reordered.map((img, idx) => ({ ...img, sort_order: idx }))

      // Update master state
      setImages((prev) =>
        prev.map((img) => {
          const match = updatedScope.find((u) => u.id === img.id)
          return match ? { ...img, sort_order: match.sort_order } : img
        })
      )

      const supabase = createClient() as any
      await Promise.all(
        updatedScope.map((img) =>
          supabase
            .from('product_images')
            .update({ sort_order: img.sort_order })
            .eq('id', img.id)
        )
      )

      setSuccessMessage('Sort order updated!')
    } catch (err: unknown) {
      console.error('Error reordering images:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reorder images.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Image Deletion
  const handleDeleteImage = async (img: ProductImage) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    setSaving(true)
    setErrorMessage(null)

    try {
      // 1. Remove from Cloudinary if public_id exists
      if (img.cloudinary_public_id) {
        try {
          await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: img.cloudinary_public_id }),
          })
        } catch (cErr) {
          console.warn('Could not delete asset from Cloudinary:', cErr)
        }
      }

      // 2. Remove row from Supabase
      const supabase = createClient() as any
      const { error } = await supabase.from('product_images').delete().eq('id', img.id)
      if (error) throw error

      const targetVarId = img.variation_id
      const remaining = images.filter((i) => i.id !== img.id)
      const remainingInScope = remaining.filter((i) =>
        targetVarId ? i.variation_id === targetVarId : i.variation_id === null
      )

      // 3. If deleted image was main, promote first remaining image in scope to main
      if (img.is_main && remainingInScope.length > 0) {
        const nextMain = remainingInScope[0]
        await supabase
          .from('product_images')
          .update({ is_main: true })
          .eq('id', nextMain.id)

        setImages(
          remaining.map((i) => (i.id === nextMain.id ? { ...i, is_main: true } : i))
        )
      } else {
        setImages(remaining)
      }

      setSuccessMessage('Image deleted successfully!')
    } catch (err: unknown) {
      console.error('Error deleting image:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete image.')
    } finally {
      setSaving(false)
    }
  }

  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  // Product default images (variation_id === null)
  const defaultImages = images.filter((img) => img.variation_id === null)

  if (loading) {
    return (
      <div className="py-12 text-center text-muted font-medium animate-pulse">
        Loading product image management...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Link href="/admin/products" className="text-sm text-accent hover:underline font-bold">
          ← Back to Products
        </Link>
        <EmptyState
          title="Product Not Found"
          description="The product you are trying to manage does not exist."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* Navigation & Header */}
      <div className="space-y-3 border-b border-border pb-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
        >
          ← Back to Products Catalog
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Product Images: {product.name}
              </h1>
              {product.categories && (
                <Badge variant="secondary" size="sm">
                  {product.categories.name}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              Organized by scope: manage Product Default images plus variation-specific photos. Each scope independently maintains its own main image (<code className="font-mono text-accent">is_main</code>).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {product.has_variations && (
              <Link href={`/admin/products/${product.id}/variations`}>
                <Button variant="secondary" size="sm" className="font-bold">
                  ⚙️ Manage Variations ({variations.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
          ✅ {successMessage}
        </div>
      )}

      {/* SECTION 0: PRODUCT DEFAULT IMAGES (variation_id === null) */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                📦 Product Default Images
              </h2>
              <Badge variant="primary" size="sm">
                Default Fallback
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Primary fallback photos for non-variation views and product cards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CldUploadWidget
              uploadPreset={uploadPreset}
              options={{
                folder: `products/${product.id}`,
                multiple: true,
                maxFiles: 10,
                sources: ['local', 'url', 'camera'],
                clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'avif'],
              }}
              onSuccess={(res) => handleUploadSuccess(res, null)}
            >
              {({ open }) => (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => open?.()}
                  disabled={saving}
                  className="font-bold gap-1.5"
                >
                  ☁️ Upload Default Image(s)
                </Button>
              )}
            </CldUploadWidget>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setManualUrlScope(manualUrlScope === null ? 'CLOSED' : null)
              }
              disabled={saving}
            >
              🔗 URL
            </Button>
          </div>
        </div>

        {/* Manual URL Form for Default Scope */}
        {manualUrlScope === null && (
          <div className="p-4 rounded-xl bg-surface-hover/40 border border-border space-y-3">
            <div className="text-xs font-bold text-foreground">Add Direct Image URL (Product Default)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Image URL (https://...)"
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                disabled={saving}
              />
              <Input
                placeholder="Cloudinary Public ID (Optional)"
                value={manualPublicIdInput}
                onChange={(e) => setManualPublicIdInput(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setManualUrlScope('CLOSED')}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAddManualUrl(null)}
                disabled={!manualUrlInput.trim() || saving}
              >
                Add Image
              </Button>
            </div>
          </div>
        )}

        {/* Product Default Grid */}
        {defaultImages.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-border rounded-xl text-center space-y-2">
            <div className="text-sm font-semibold text-foreground">No Default Product Images</div>
            <div className="text-xs text-muted">
              Upload images to serve as default thumbnails across the catalog.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {defaultImages.map((img, idx) => (
              <ImageCard
                key={img.id}
                img={img}
                index={idx}
                scopeImages={defaultImages}
                saving={saving}
                onSetMain={handleSetMainImage}
                onMove={(dir) => handleMoveImage(defaultImages, idx, dir)}
                onDelete={handleDeleteImage}
                scopeLabel="Product Default"
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTIONS 1...N: VARIATION SPECIFIC IMAGES */}
      {product.has_variations && variations.length > 0 && (
        <div className="space-y-6">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              🏷️ Variation-Specific Images ({variations.length} options)
            </h2>
            <p className="text-xs text-muted">
              Upload dedicated images per variation option (e.g. 250g vs 500g vs 1kg). Variations without specific images visibly fall back to Product Default images.
            </p>
          </div>

          {variations.map((v) => {
            const varImages = images.filter((img) => img.variation_id === v.id)
            const attrsObj = (v.attributes as Record<string, string>) || {}
            const varTitle =
              Object.entries(attrsObj)
                .map(([k, val]) => `${k}: ${val}`)
                .join(', ') || v.sku || 'Variation'

            const isUsingFallback = varImages.length === 0

            return (
              <div
                key={v.id}
                className="bg-surface rounded-2xl border border-border p-6 space-y-6 shadow-xs"
              >
                {/* Variation Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-foreground tracking-tight">
                        Option: {varTitle}
                      </h3>
                      {v.sku && (
                        <span className="font-mono text-xs text-muted px-2 py-0.5 rounded bg-surface-hover border border-border">
                          {v.sku}
                        </span>
                      )}
                      {isUsingFallback ? (
                        <Badge variant="secondary" size="sm">
                          Using Product Default Fallback
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          {varImages.length} Dedicated Image(s)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CldUploadWidget
                      uploadPreset={uploadPreset}
                      options={{
                        folder: `products/${product.id}`,
                        multiple: true,
                        maxFiles: 10,
                        sources: ['local', 'url', 'camera'],
                        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'avif'],
                      }}
                      onSuccess={(res) => handleUploadSuccess(res, v.id)}
                    >
                      {({ open }) => (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => open?.()}
                          disabled={saving}
                          className="font-bold gap-1.5"
                        >
                          ☁️ Upload for {varTitle}
                        </Button>
                      )}
                    </CldUploadWidget>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setManualUrlScope(manualUrlScope === v.id ? 'CLOSED' : v.id)
                      }
                      disabled={saving}
                    >
                      🔗 URL
                    </Button>
                  </div>
                </div>

                {/* Manual URL Form for this Variation */}
                {manualUrlScope === v.id && (
                  <div className="p-4 rounded-xl bg-surface-hover/40 border border-border space-y-3">
                    <div className="text-xs font-bold text-foreground">
                      Add Direct Image URL for {varTitle}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Image URL (https://...)"
                        value={manualUrlInput}
                        onChange={(e) => setManualUrlInput(e.target.value)}
                        disabled={saving}
                      />
                      <Input
                        placeholder="Cloudinary Public ID (Optional)"
                        value={manualPublicIdInput}
                        onChange={(e) => setManualPublicIdInput(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setManualUrlScope('CLOSED')}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddManualUrl(v.id)}
                        disabled={!manualUrlInput.trim() || saving}
                      >
                        Add Image
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dedicated Variation Images Grid */}
                {!isUsingFallback ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {varImages.map((img, idx) => (
                      <ImageCard
                        key={img.id}
                        img={img}
                        index={idx}
                        scopeImages={varImages}
                        saving={saving}
                        onSetMain={handleSetMainImage}
                        onMove={(dir) => handleMoveImage(varImages, idx, dir)}
                        onDelete={handleDeleteImage}
                        scopeLabel={varTitle}
                      />
                    ))}
                  </div>
                ) : (
                  /* VISIBLE FALLBACK DISPLAY: Show Product Default images with clear label */
                  <div className="p-4 rounded-xl bg-surface-hover/30 border border-dashed border-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted">
                        📷 Showing Product Default images as display fallback:
                      </span>
                    </div>

                    {defaultImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {defaultImages.map((defImg, idx) => (
                          <div
                            key={defImg.id}
                            className="relative rounded-lg border border-border overflow-hidden bg-white aspect-square opacity-80"
                          >
                            <img
                              src={defImg.url}
                              alt={`Default fallback ${idx}`}
                              className="h-full w-full object-contain"
                            />
                            {defImg.is_main && (
                              <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Default Main
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted italic">
                        No default product images available yet. Upload images above or under Product Default.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Reusable Image Card Component for Admin Scopes
interface ImageCardProps {
  img: ProductImage
  index: number
  scopeImages: ProductImage[]
  saving: boolean
  onSetMain: (img: ProductImage) => void
  onMove: (direction: 'left' | 'right') => void
  onDelete: (img: ProductImage) => void
  scopeLabel: string
}

function ImageCard({
  img,
  index,
  scopeImages,
  saving,
  onSetMain,
  onMove,
  onDelete,
}: ImageCardProps) {
  const isFirst = index === 0
  const isLast = index === scopeImages.length - 1

  return (
    <div
      className={`group relative bg-surface rounded-2xl border ${
        img.is_main
          ? 'border-accent ring-2 ring-accent/30 shadow-md'
          : 'border-border shadow-xs'
      } overflow-hidden flex flex-col justify-between transition-all`}
    >
      {/* Top Status Bar: Radio Toggle & Sort Pill */}
      <div className="p-2.5 bg-surface-hover/60 border-b border-border flex items-center justify-between text-xs">
        <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold select-none text-foreground">
          <input
            type="radio"
            name={`main_img_${img.product_id}_${img.variation_id || 'default'}`}
            checked={Boolean(img.is_main)}
            onChange={() => onSetMain(img)}
            disabled={saving}
            className="h-4 w-4 text-accent border-border focus:ring-accent"
          />
          <span
            className={
              img.is_main ? 'text-accent font-extrabold' : 'text-muted font-medium'
            }
          >
            {img.is_main ? '★ Scope Main' : 'Mark Main'}
          </span>
        </label>

        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-border text-muted">
          #{img.sort_order ?? index}
        </span>
      </div>

      {/* Image Preview Container */}
      <div className="relative aspect-square w-full bg-white overflow-hidden flex items-center justify-center p-2">
        <img src={img.url} alt={`Image ${index}`} className="h-full w-full object-contain" />

        {img.cloudinary_public_id && (
          <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs max-w-[85%] truncate">
            ☁️ {img.cloudinary_public_id}
          </span>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-surface border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove('left')}
            disabled={isFirst || saving}
            className="p-1.5 rounded bg-surface-hover hover:bg-border text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Move left/up"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onMove('right')}
            disabled={isLast || saving}
            className="p-1.5 rounded bg-surface-hover hover:bg-border text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Move right/down"
          >
            ▶
          </button>
        </div>

        <button
          type="button"
          onClick={() => onDelete(img)}
          disabled={saving}
          className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline cursor-pointer"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}
