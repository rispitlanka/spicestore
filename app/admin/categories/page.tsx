'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Badge } from '@/components/atoms/Badge'
import { EmptyState } from '@/components/atoms/EmptyState'

interface CategoryWithCount extends Tables<'categories'> {
  product_count?: number
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form Fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isActive, setIsActive] = useState(true)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const supabase = createClient() as any
    
    // Fetch categories and join product counts
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (catError) {
      console.error('Error fetching categories:', catError)
      setErrorMessage('Failed to load categories.')
      setLoading(false)
      return
    }

    // Fetch product counts per category
    const { data: prodData } = await supabase
      .from('products')
      .select('category_id')

    const counts: Record<string, number> = {}
    if (prodData) {
      ;(prodData as unknown as Array<{ category_id: string | null }>).forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1
        }
      })
    }

    const formatted = ((catData as unknown as Tables<'categories'>[]) || []).map((cat) => ({
      ...cat,
      product_count: counts[cat.id] || 0,
    }))

    setCategories(formatted)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!editingCategory) {
      setSlug(generateSlug(val))
    }
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setName('')
    setSlug('')
    setIsActive(true)
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const openEditModal = (category: CategoryWithCount) => {
    setEditingCategory(category)
    setName(category.name)
    setSlug(category.slug)
    setIsActive(category.is_active)
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Category name is required.')
      return
    }

    const finalSlug = slug.trim() || generateSlug(name)
    if (!finalSlug) {
      setErrorMessage('Category slug is required.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    const supabase = createClient() as any

    try {
      if (editingCategory) {
        // UPDATE
        const { error } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            slug: finalSlug,
            is_active: isActive,
          } as any)
          .eq('id', editingCategory.id)

        if (error) throw error
      } else {
        // INSERT
        const { error } = await supabase.from('categories').insert({
          name: name.trim(),
          slug: finalSlug,
          is_active: isActive,
        } as any)

        if (error) throw error
      }

      setIsModalOpen(false)
      fetchCategories()
    } catch (err: unknown) {
      console.error('Error saving category:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save category.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (category: CategoryWithCount) => {
    const supabase = createClient() as any
    const newStatus = !category.is_active
    const { error } = await supabase
      .from('categories')
      .update({ is_active: newStatus } as any)
      .eq('id', category.id)

    if (!error) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, is_active: newStatus } : c))
      )
    }
  }

  const handleDeleteCategory = async (id: string) => {
    setSubmitting(true)
    const supabase = createClient() as any
    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      alert(`Cannot delete category: ${error.message}`)
    } else {
      setDeletingCategory(null)
      fetchCategories()
    }
    setSubmitting(false)
  }

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Categories Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Organize products into store categories and manage catalog visibility.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openCreateModal} className="font-semibold shrink-0">
          + Add Category
        </Button>
      </div>

      {/* Search & Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs font-semibold text-muted">
          Showing {filteredCategories.length} of {categories.length} categories
        </div>
      </div>

      {/* Categories Table */}
      {loading ? (
        <div className="py-12 text-center text-muted font-medium animate-pulse">
          Loading categories...
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8">
          <EmptyState
            title="No Categories Found"
            description="Create your first category to group products together."
          />
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-hover/60 border-b border-border text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Products Linked</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{cat.name}</td>
                    <td className="px-6 py-4 text-xs font-mono text-muted">{cat.slug}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/10 text-accent">
                        {cat.product_count} products
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className="cursor-pointer"
                      >
                        {cat.is_active ? (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            Hidden / Inactive
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(cat)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingCategory(cat)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl p-6 sm:p-8 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
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

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <Input
                label="Category Name"
                required
                placeholder="e.g. Spices & Powders"
                value={name}
                onChange={handleNameChange}
                disabled={submitting}
              />

              <Input
                label="Slug"
                required
                placeholder="spices-and-powders"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={submitting}
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="catActiveToggle" className="text-sm font-semibold text-foreground">
                  Active (visible in public navigation & filters)
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
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeletingCategory(null)}
          />

          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-foreground">Confirm Category Deletion</h3>
            <p className="text-sm text-muted">
              Are you sure you want to delete category <strong className="text-foreground">{deletingCategory.name}</strong>?
              {deletingCategory.product_count ? (
                <span className="block mt-2 font-bold text-red-600">
                  Warning: {deletingCategory.product_count} products are currently linked to this category.
                </span>
              ) : null}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingCategory(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDeleteCategory(deletingCategory.id)}
                isLoading={submitting}
                disabled={submitting}
              >
                Delete Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
