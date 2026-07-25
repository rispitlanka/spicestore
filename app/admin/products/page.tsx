/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '@/lib/cloudinary/upload'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Badge } from '@/components/atoms/Badge'
import { PriceTag } from '@/components/atoms/PriceTag'
import { WeightTag } from '@/components/atoms/WeightTag'
import { EmptyState } from '@/components/atoms/EmptyState'

interface GalleryImageItem {
  url: string
  cloudinary_public_id?: string | null
}

interface ProductWithRelations extends Tables<'products'> {
  categories?: Tables<'categories'> | null
  product_images?: Tables<'product_images'>[]
  product_variations?: Tables<'product_variations'>[]
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [categories, setCategories] = useState<Tables<'categories'>[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form Fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [hasVariations, setHasVariations] = useState(false)
  const [basePrice, setBasePrice] = useState<number | ''>('')
  const [baseWeightKg, setBaseWeightKg] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Image Upload state: Array of Cloudinary gallery image objects
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const fetchProductsAndCategories = useCallback(async () => {
    setLoading(true)
    const supabase = createClient() as any

    const [prodRes, catRes] = await Promise.all([
      supabase
        .from('products')
        .select(`
          *,
          categories(*),
          product_images(*),
          product_variations(*)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
    ])

    if (prodRes.error) {
      console.error('Error fetching products:', prodRes.error)
      setErrorMessage('Failed to load products.')
    } else {
      setProducts(prodRes.data || [])
    }

    if (!catRes.error) {
      setCategories(catRes.data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProductsAndCategories()
  }, [fetchProductsAndCategories])

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setSlug('')
    setCategoryId('')
    setHasVariations(false)
    setBasePrice('')
    setBaseWeightKg('')
    setDescription('')
    setIsActive(true)
    setGalleryImages([])
    setUrlInput('')
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const openEditModal = (product: ProductWithRelations) => {
    setEditingProduct(product)
    setName(product.name)
    setSlug(product.slug)
    setCategoryId(product.category_id || '')
    setHasVariations(product.has_variations)
    setBasePrice(product.base_price ?? '')
    setBaseWeightKg(product.base_weight_kg ?? '')
    setDescription(product.description || '')
    setIsActive(product.is_active)

    const sortedImages = product.product_images
      ? [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : []
    setGalleryImages(
      sortedImages.map((img) => ({
        url: img.url,
        cloudinary_public_id: img.cloudinary_public_id || null,
      }))
    )
    setUrlInput('')
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!editingProduct) {
      setSlug(generateSlug(val))
    }
  }

  // Handle Cloudinary image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    setErrorMessage(null)

    try {
      const newItems: GalleryImageItem[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { url, public_id, error } = await uploadImageToCloudinary(file, 'products')
        if (error) {
          setErrorMessage(`Upload error (${file.name}): ${error}`)
        } else if (url) {
          newItems.push({ url, cloudinary_public_id: public_id })
        }
      }

      setGalleryImages((prev) => [...prev, ...newItems])
    } catch (err: unknown) {
      console.error('File upload exception:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
      // Reset input value
      e.target.value = ''
    }
  }

  const handleAddUrl = () => {
    const trimmed = urlInput.trim()
    if (trimmed && !galleryImages.some((item) => item.url === trimmed)) {
      setGalleryImages((prev) => [...prev, { url: trimmed, cloudinary_public_id: null }])
      setUrlInput('')
    }
  }

  const handleRemoveImage = async (itemToRemove: GalleryImageItem) => {
    setGalleryImages((prev) => prev.filter((item) => item.url !== itemToRemove.url))
    if (itemToRemove.cloudinary_public_id) {
      deleteImageFromCloudinary(itemToRemove.cloudinary_public_id)
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    if (!name.trim()) {
      setErrorMessage('Product name is required.')
      setSubmitting(false)
      return
    }

    const numPrice = basePrice === '' ? null : Number(basePrice)
    const numWeight = baseWeightKg === '' ? null : Number(baseWeightKg)

    if (!hasVariations) {
      if (numPrice === null || isNaN(numPrice) || numPrice < 0) {
        setErrorMessage('Please enter a valid base price for single product.')
        setSubmitting(false)
        return
      }
      if (numWeight === null || isNaN(numWeight) || numWeight < 0) {
        setErrorMessage('Please enter a valid base weight in kg for single product.')
        setSubmitting(false)
        return
      }
    }

    const finalSlug = slug.trim() || generateSlug(name)
    const supabase = createClient() as any

    try {
      let productId = editingProduct?.id

      const productPayload = {
        name: name.trim(),
        slug: finalSlug,
        category_id: categoryId || null,
        description: description.trim() || null,
        has_variations: hasVariations,
        base_price: hasVariations ? null : numPrice,
        base_weight_kg: hasVariations ? null : numWeight,
        is_active: isActive,
      }

      if (editingProduct) {
        // UPDATE Product
        const { error: updateErr } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProduct.id)

        if (updateErr) throw updateErr
      } else {
        // INSERT Product
        const { data: newProd, error: insertErr } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .single()

        if (insertErr) throw insertErr
        productId = newProd.id
      }

      if (productId) {
        // 1. Manage Default Variation for single product
        if (!hasVariations && numPrice !== null && numWeight !== null) {
          const { data: existingVars } = await supabase
            .from('product_variations')
            .select('id')
            .eq('product_id', productId)

          if (existingVars && existingVars.length > 0) {
            await supabase
              .from('product_variations')
              .update({
                price: numPrice,
                weight_kg: numWeight,
                is_active: isActive,
              })
              .eq('id', existingVars[0].id)
          } else {
            await supabase.from('product_variations').insert({
              product_id: productId,
              price: numPrice,
              weight_kg: numWeight,
              stock: 10,
              sku: `${finalSlug}-default`,
              is_active: isActive,
            })
          }
        }

        // 2. Sync Gallery Images in product_images table
        await supabase.from('product_images').delete().eq('product_id', productId)

        if (galleryImages.length > 0) {
          const imageRows = galleryImages.map((item, index) => ({
            product_id: productId!,
            url: item.url,
            cloudinary_public_id: item.cloudinary_public_id || null,
            sort_order: index,
            is_main: index === 0,
          }))
          await supabase.from('product_images').insert(imageRows)
        }
      }

      setIsModalOpen(false)
      await fetchProductsAndCategories()
    } catch (err: unknown) {
      console.error('Error saving product:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save product.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    const supabase = createClient() as any
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert(`Failed to delete product: ${error.message}`)
    } else {
      setDeletingProductId(null)
      fetchProductsAndCategories()
    }
  }

  const handleToggleActive = async (product: ProductWithRelations) => {
    const supabase = createClient() as any
    const newStatus = !product.is_active
    const { error } = await supabase
      .from('products')
      .update({ is_active: newStatus })
      .eq('id', product.id)

    if (!error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p))
      )
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Products Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage parent products, categories, base pricing, variations, and image galleries.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openCreateModal} className="font-semibold shrink-0">
          + Add New Product
        </Button>
      </div>

      {/* Search & Category Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search products by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              options={[
                { label: 'All Categories', value: 'all' },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ]}
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-muted">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="py-12 text-center text-muted font-medium animate-pulse">
          Loading catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8">
          <EmptyState
            title="No Products Found"
            description="Try adjusting your search criteria or add your first product."
          />
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-hover/60 border-b border-border text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Weight</th>
                  <th className="px-6 py-4">Variations</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProducts.map((product) => {
                  const sortedImages = product.product_images
                    ? [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    : []
                  const mainImage = product.product_images?.find((img) => img.is_main) || sortedImages[0]
                  const imageUrl = mainImage?.url
                  const varCount = product.product_variations?.length || 0

                  return (
                    <tr key={product.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-surface-hover overflow-hidden flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <svg
                                className="h-6 w-6 text-muted/40"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground line-clamp-1">
                              {product.name}
                            </div>
                            <div className="text-xs text-muted font-mono">{product.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {product.categories ? (
                          <Badge variant="secondary" size="sm">
                            {product.categories.name}
                          </Badge>
                        ) : (
                          <span className="text-muted text-xs font-italic">Uncategorized</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {product.has_variations ? (
                          <span className="text-xs text-muted font-semibold">Varies per variation</span>
                        ) : (
                          <PriceTag amount={product.base_price ?? 0} size="sm" />
                        )}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {product.has_variations ? (
                          <span className="text-xs text-muted font-semibold">Varies</span>
                        ) : (
                          <WeightTag weightKg={product.base_weight_kg} size="sm" />
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {product.has_variations ? (
                          <Link href={`/admin/products/${product.id}/variations`}>
                            <Button variant="primary" size="sm" className="text-xs font-bold gap-1.5">
                              <span>⚙️ Variations</span>
                              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                                {varCount}
                              </span>
                            </Button>
                          </Link>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            Single Product
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product)}
                          className="cursor-pointer"
                        >
                          {product.is_active ? (
                            <Badge variant="success" size="sm">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm">
                              Draft
                            </Badge>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/${product.id}`}>
                            <Button variant="secondary" size="sm" className="gap-1 font-semibold">
                              <span>🖼️ Images</span>
                              <span className="bg-muted/20 px-1.5 py-0.5 rounded text-[10px]">
                                {product.product_images?.length || 0}
                              </span>
                            </Button>
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(product)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingProductId(product.id)}
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

      {/* Create / Edit Parent Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl p-6 sm:p-8 space-y-6 my-8 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
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

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Name"
                  required
                  placeholder="e.g. Jaffna Curry Powder"
                  value={name}
                  onChange={handleNameChange}
                  disabled={submitting}
                />

                <Input
                  label="Slug"
                  required
                  placeholder="jaffna-curry-powder"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <Select
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={submitting}
                placeholder="-- Select Product Category --"
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
              />

              {/* Variations Toggle */}
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-foreground">Has Product Variations?</div>
                  <div className="text-xs text-muted">
                    Enable if product has multiple options like different weights, sizes, or flavors.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariations}
                    onChange={(e) => setHasVariations(e.target.checked)}
                    className="sr-only peer"
                    disabled={submitting}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {/* Base price & weight if no variations */}
              {!hasVariations && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-surface-hover/30">
                  <Input
                    label="Base Price ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="14.99"
                    value={basePrice}
                    onChange={(e) =>
                      setBasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    disabled={submitting}
                  />

                  <Input
                    label="Base Weight (kg)"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.50"
                    value={baseWeightKg}
                    onChange={(e) =>
                      setBaseWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    disabled={submitting}
                  />
                </div>
              )}

              <Textarea
                label="Description"
                rows={3}
                placeholder="Detailed description of the product..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />

              {/* Cloudinary Storage Image Gallery & Upload */}
              <div className="space-y-2 border-t border-border pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Product Image Gallery (Cloudinary Storage)
                </label>

                {/* Gallery Preview */}
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pb-2">
                    {galleryImages.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-lg border border-border overflow-hidden bg-surface aspect-square"
                      >
                        <img
                          src={item.url}
                          alt={`Gallery ${idx}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(item)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-90 group-hover:opacity-100 cursor-pointer shadow-xs"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload File Input */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent bg-surface-hover/40 transition-colors">
                    <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-xs font-bold text-foreground">
                      {uploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image File(s)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploadingImage || submitting}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* External URL alternative */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="Or enter direct image URL..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleAddUrl}
                    disabled={!urlInput.trim() || submitting}
                  >
                    Add URL
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prodIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="prodIsActive" className="text-sm font-semibold text-foreground">
                  Active in public store catalog
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
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeletingProductId(null)}
          />

          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-foreground">Confirm Product Deletion</h3>
            <p className="text-sm text-muted">
              Are you sure you want to delete this product? All linked variations and images will also be removed.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={() => setDeletingProductId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDeleteProduct(deletingProductId)}
              >
                Delete Product
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
