/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'
import { uploadImageToCloudinary } from '@/lib/cloudinary/upload'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Badge } from '@/components/atoms/Badge'
import { PriceTag } from '@/components/atoms/PriceTag'
import { WeightTag } from '@/components/atoms/WeightTag'
import { EmptyState } from '@/components/atoms/EmptyState'

interface AttributePair {
  key: string
  value: string
}

interface VariationWithImage extends Tables<'product_variations'> {
  image_url?: string | null
  cloudinary_public_id?: string | null
}

interface ProductDetail extends Tables<'products'> {
  categories?: Tables<'categories'> | null
  product_images?: Tables<'product_images'>[]
}

export default function ProductVariationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)
  const productId = resolvedParams.id

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [variations, setVariations] = useState<VariationWithImage[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVar, setEditingVar] = useState<VariationWithImage | null>(null)
  const [deletingVarId, setDeletingVarId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Variation Form state
  const [attributePairs, setAttributePairs] = useState<AttributePair[]>([
    { key: 'Weight', value: '' },
  ])
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [weightKg, setWeightKg] = useState<number | ''>('')
  const [stock, setStock] = useState<number | ''>(10)
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient() as any

    // 1. Fetch parent product details
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('*, categories(*), product_images(*)')
      .eq('id', productId)
      .single()

    if (prodErr || !prodData) {
      console.error('Error fetching parent product:', prodErr)
      setErrorMessage('Product not found.')
      setLoading(false)
      return
    }

    setProduct(prodData)

    // 2. Fetch variations for this product
    const { data: varData, error: varErr } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', productId)

    if (varErr) {
      console.error('Error fetching variations:', varErr)
      setErrorMessage('Failed to load product variations.')
    } else {
      // Also fetch variation specific images from product_images table
      const { data: imgData } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .not('variation_id', 'is', null)

      const imageMap: Record<string, { url: string; public_id?: string | null }> = {}
      if (imgData) {
        ;(imgData as any[]).forEach((img: any) => {
          if (img.variation_id) {
            imageMap[img.variation_id] = { url: img.url, public_id: img.cloudinary_public_id }
          }
        })
      }

      const formatted = ((varData as any[]) || []).map((v: any) => ({
        ...v,
        image_url: imageMap[v.id]?.url || null,
        cloudinary_public_id: imageMap[v.id]?.public_id || null,
      }))

      setVariations(formatted)
    }

    setLoading(false)
  }, [productId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreateModal = () => {
    setEditingVar(null)
    setAttributePairs([{ key: 'Weight', value: '' }])
    setSku(`${product?.slug || 'var'}-${Date.now().toString().slice(-4)}`)
    setPrice(product?.base_price ?? '')
    setWeightKg(product?.base_weight_kg ?? '')
    setStock(10)
    setIsActive(true)
    setImageUrl('')
    setCloudinaryPublicId(null)
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const openEditModal = (v: VariationWithImage) => {
    setEditingVar(v)

    // Parse attributes object into array of pairs
    const attrsObj = (v.attributes as Record<string, string>) || {}
    const pairs: AttributePair[] = Object.entries(attrsObj).map(([key, value]) => ({
      key,
      value: String(value),
    }))

    if (pairs.length === 0) {
      pairs.push({ key: 'Weight', value: '' })
    }

    setAttributePairs(pairs)
    setSku(v.sku || '')
    setPrice(v.price)
    setWeightKg(v.weight_kg)
    setStock(v.stock)
    setIsActive(v.is_active)
    setImageUrl(v.image_url || '')
    setCloudinaryPublicId(v.cloudinary_public_id || null)
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  // Attribute pairs handlers
  const handleAddAttributePair = () => {
    setAttributePairs((prev) => [...prev, { key: '', value: '' }])
  }

  const handleRemoveAttributePair = (index: number) => {
    setAttributePairs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAttributeChange = (index: number, field: 'key' | 'value', val: string) => {
    setAttributePairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: val } : pair))
    )
  }

  // Handle variation image upload to Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setErrorMessage(null)

    const { url, public_id, error } = await uploadImageToCloudinary(file, 'variations')
    if (error) {
      setErrorMessage(`Upload error: ${error}`)
    } else if (url) {
      setImageUrl(url)
      setCloudinaryPublicId(public_id)
    }

    setUploadingImage(false)
    e.target.value = ''
  }

  const handleSaveVariation = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    const numPrice = Number(price)
    const numWeight = Number(weightKg)
    const numStock = Number(stock)

    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMessage('Please enter a valid price.')
      setSubmitting(false)
      return
    }

    if (isNaN(numWeight) || numWeight < 0) {
      setErrorMessage('Please enter a valid weight in kg.')
      setSubmitting(false)
      return
    }

    if (isNaN(numStock) || numStock < 0) {
      setErrorMessage('Please enter a valid stock count.')
      setSubmitting(false)
      return
    }

    // Convert attribute pairs to JSON object
    const attributesObj: Record<string, string> = {}
    attributePairs.forEach((pair) => {
      if (pair.key.trim()) {
        attributesObj[pair.key.trim()] = pair.value.trim()
      }
    })

    const supabase = createClient() as any

    try {
      let varId = editingVar?.id

      if (editingVar) {
        // UPDATE Variation
        const { error } = await supabase
          .from('product_variations')
          .update({
            attributes: attributesObj,
            sku: sku.trim() || null,
            price: numPrice,
            weight_kg: numWeight,
            stock: numStock,
            is_active: isActive,
          })
          .eq('id', editingVar.id)

        if (error) throw error
      } else {
        // INSERT Variation
        const { data: newVar, error } = await supabase
          .from('product_variations')
          .insert({
            product_id: productId,
            attributes: attributesObj,
            sku: sku.trim() || null,
            price: numPrice,
            weight_kg: numWeight,
            stock: numStock,
            is_active: isActive,
          })
          .select('id')
          .single()

        if (error) throw error
        varId = newVar.id
      }

      // Ensure parent product has_variations is set to true
      if (product && !product.has_variations) {
        await supabase
          .from('products')
          .update({ has_variations: true })
          .eq('id', productId)
      }

      // Save variation-specific image link in product_images
      if (varId) {
        await supabase
          .from('product_images')
          .delete()
          .eq('variation_id', varId)

        if (imageUrl.trim()) {
          await supabase.from('product_images').insert({
            product_id: productId,
            variation_id: varId,
            url: imageUrl.trim(),
            cloudinary_public_id: cloudinaryPublicId || null,
            sort_order: 0,
            is_main: true,
          })
        }
      }

      setIsModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      console.error('Error saving variation:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save variation.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteVariation = async (id: string) => {
    setSubmitting(true)
    const supabase = createClient() as any
    const { error } = await supabase.from('product_variations').delete().eq('id', id)

    if (error) {
      alert(`Failed to delete variation: ${error.message}`)
    } else {
      setDeletingVarId(null)
      fetchData()
    }
    setSubmitting(false)
  }

  const handleToggleActive = async (v: VariationWithImage) => {
    const supabase = createClient() as any
    const newStatus = !v.is_active
    const { error } = await supabase
      .from('product_variations')
      .update({ is_active: newStatus })
      .eq('id', v.id)

    if (!error) {
      setVariations((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, is_active: newStatus } : item))
      )
    }
  }

  if (loading && !product) {
    return (
      <div className="py-12 text-center text-muted font-medium animate-pulse">
        Loading product variations...
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
    <div className="space-y-8">
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
                Variations for: {product.name}
              </h1>
              {product.categories && (
                <Badge variant="secondary" size="sm">
                  {product.categories.name}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              Add and edit options like weights, sizes, pricing, stock levels, and variation images.
            </p>
          </div>

          <Button variant="primary" size="md" onClick={openCreateModal} className="font-semibold shrink-0">
            + Add Variation
          </Button>
        </div>
      </div>

      {/* Variations Table */}
      {variations.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center space-y-4">
          <EmptyState
            title="No Variations Created Yet"
            description="Add your first variation (e.g. 250g, 500g, 1kg) to give customers choices."
          />
          <Button variant="primary" size="md" onClick={openCreateModal} className="font-semibold">
            + Add First Variation
          </Button>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-hover/60 border-b border-border text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Attributes</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Weight</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {variations.map((v) => {
                  const attrsObj = (v.attributes as Record<string, string>) || {}
                  const attrEntries = Object.entries(attrsObj)

                  return (
                    <tr key={v.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-surface-hover overflow-hidden flex items-center justify-center">
                          {v.image_url ? (
                            <img
                              src={v.image_url}
                              alt={v.sku || 'Variation'}
                              className="h-full w-full object-cover object-center"
                            />
                          ) : (
                            <span className="text-[10px] text-muted font-bold">No img</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {attrEntries.length > 0 ? (
                            attrEntries.map(([k, val]) => (
                              <span
                                key={k}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-hover border border-border text-foreground"
                              >
                                <span className="text-muted">{k}:</span>
                                <span>{val}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted">Default</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-muted">
                        {v.sku || '—'}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        <PriceTag amount={v.price} size="sm" />
                      </td>

                      <td className="px-6 py-4 font-medium">
                        <WeightTag weightKg={v.weight_kg} size="sm" />
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-foreground">
                        {v.stock} units
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(v)}
                          className="cursor-pointer"
                        >
                          {v.is_active ? (
                            <Badge variant="success" size="sm">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm">
                              Disabled
                            </Badge>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(v)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingVarId(v.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Variation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-surface rounded-2xl border border-border shadow-2xl p-6 sm:p-8 space-y-6 my-8 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                {editingVar ? 'Edit Variation' : 'Add Product Variation'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveVariation} className="space-y-4">
              {/* Dynamic Attributes Key-Value Builder */}
              <div className="space-y-3 bg-surface-hover/30 p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    Variation Attributes (Key-Value Pairs)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAttributePair}
                    className="text-xs font-extrabold text-accent hover:underline cursor-pointer"
                  >
                    + Add Attribute
                  </button>
                </div>

                <div className="space-y-2">
                  {attributePairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Key (e.g. Weight)"
                        value={pair.key}
                        onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)}
                        disabled={submitting}
                      />
                      <Input
                        placeholder="Value (e.g. 500g)"
                        value={pair.value}
                        onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                        disabled={submitting}
                      />
                      {attributePairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttributePair(idx)}
                          className="text-red-500 hover:text-red-700 font-bold p-2 text-sm cursor-pointer"
                          title="Remove pair"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SKU Code"
                  placeholder="e.g. JCP-500G"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={submitting}
                />

                <Input
                  label="Stock Quantity"
                  type="number"
                  min="0"
                  required
                  placeholder="10"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="12.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  disabled={submitting}
                />

                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.50"
                  value={weightKg}
                  onChange={(e) =>
                    setWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  disabled={submitting}
                />
              </div>

              {/* Variation Image Upload or Select from Product Gallery */}
              <div className="space-y-2 border-t border-border pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Variation Image (Optional)
                </label>

                {imageUrl && (
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg border border-border overflow-hidden bg-surface">
                      <img src={imageUrl} alt="Variation" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove variation image
                    </button>
                  </div>
                )}

                {/* Upload File to Cloudinary */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl cursor-pointer hover:border-accent bg-surface-hover/30 transition-colors">
                    <span className="text-xs font-bold text-foreground">
                      {uploadingImage ? 'Uploading image...' : 'Upload Image File'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || submitting}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Select from parent product images */}
                {product.product_images && product.product_images.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-muted block mb-1.5">
                      Or select from product gallery:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.product_images.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setImageUrl(img.url)}
                          className={`h-10 w-10 rounded-md border-2 overflow-hidden cursor-pointer transition-all ${
                            imageUrl === img.url ? 'border-accent ring-2 ring-accent/30' : 'border-border'
                          }`}
                        >
                          <img src={img.url} alt="Gallery" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="varIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="varIsActive" className="text-sm font-semibold text-foreground">
                  Active (purchasable by customers)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="font-semibold"
                  isLoading={submitting}
                  disabled={submitting}
                >
                  {editingVar ? 'Update Variation' : 'Create Variation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeletingVarId(null)}
          />

          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-foreground">Confirm Variation Deletion</h3>
            <p className="text-sm text-muted">
              Are you sure you want to delete this variation? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingVarId(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDeleteVariation(deletingVarId)}
                isLoading={submitting}
                disabled={submitting}
              >
                Delete Variation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
