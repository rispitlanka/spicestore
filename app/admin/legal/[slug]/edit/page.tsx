'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { LegalPage } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Spinner } from '@/components/atoms/Spinner'

export default function AdminLegalEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = React.use(params)
  const isNew = resolvedParams.slug === 'new'
  const router = useRouter()

  const [pageId, setPageId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const fetchPageDetails = useCallback(async () => {
    if (isNew) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient() as any
      const { data, error: err } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single()

      if (err || !data) {
        throw new Error(err?.message || 'Legal page not found.')
      }

      setPageId(data.id)
      setTitle(data.title)
      setSlug(data.slug)
      setContent(data.content)
      setIsPublished(Boolean(data.is_published))
    } catch (err: unknown) {
      console.error('Error fetching page:', err)
      setError(err instanceof Error ? err.message : 'Failed to load legal page.')
    } finally {
      setLoading(false)
    }
  }, [isNew, resolvedParams.slug])

  useEffect(() => {
    fetchPageDetails()
  }, [fetchPageDetails])

  // Helper to auto-generate slug from title for new pages if user hasn't manually edited slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (isNew) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const cleanTitle = title.trim()
    const cleanSlug = slug.trim().toLowerCase()
    const cleanContent = content.trim()

    if (!cleanTitle) {
      setError('Title is required.')
      setSaving(false)
      return
    }

    if (!cleanSlug) {
      setError('Slug is required.')
      setSaving(false)
      return
    }

    if (!cleanContent) {
      setError('Content is required.')
      setSaving(false)
      return
    }

    try {
      const supabase = createClient() as any
      const payload: Partial<LegalPage> = {
        title: cleanTitle,
        slug: cleanSlug,
        content: cleanContent,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      }

      if (pageId) {
        payload.id = pageId
      }

      const { data, error: saveErr } = await supabase
        .from('legal_pages')
        .upsert(payload as any)
        .select('*')
        .single()

      if (saveErr) throw saveErr

      setSuccess('Legal page saved successfully!')
      if (data) {
        setPageId(data.id)
        setSlug(data.slug)
      }

      if (isNew) {
        router.replace(`/admin/legal/${cleanSlug}/edit`)
      }
    } catch (err: unknown) {
      console.error('Error saving page:', err)
      setError(err instanceof Error ? err.message : 'Failed to save legal page.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-xs text-[#6B7570] font-sans">
        <Spinner size="sm" className="mr-2" /> Loading legal page details...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-[#1C2521]">
      {/* Top Header & Back Link */}
      <div className="border-b border-[#E7ECE8] pb-4 space-y-2">
        <Link
          href="/admin/legal"
          className="text-xs text-[#2F6B3C] font-semibold hover:underline inline-flex items-center gap-1"
        >
          ← Back to Legal Pages
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
              {isNew ? 'Create New Legal Page' : `Edit Page: ${title}`}
            </h1>
            <p className="mt-1 text-xs text-[#6B7570]">
              Markdown formatted text rendered on <code className="font-mono text-[#2F6B3C]">/legal/{slug || '[slug]'}</code>
            </p>
          </div>

          {!isNew && isPublished && slug && (
            <Link href={`/legal/${slug}`} target="_blank">
              <Button variant="secondary" size="sm">
                View Public Page ↗
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-sm text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="border border-green-200 bg-green-50 p-4 rounded-sm text-xs text-[#2F6B3C] font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Title, Slug & Published Toggle */}
        <div className="bg-white border border-[#E7ECE8] rounded-[4px] p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Page Title"
              name="title"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Privacy Policy"
              disabled={saving}
              required
            />

            <Input
              label="URL Slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="e.g. privacy-policy"
              helperText="Public route path: /legal/[slug]"
              disabled={saving}
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#E7ECE8]">
            <div>
              <span className="text-xs font-semibold text-[#1C2521] block">Publication Status</span>
              <span className="text-xs text-[#6B7570]">
                {isPublished
                  ? 'Visible on public storefront to all customers.'
                  : 'Hidden from public storefront (returns 404 for visitors).'}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E7ECE8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6B3C]"></div>
            </label>
          </div>
        </div>

        {/* Content Editor with Edit / Preview Tabs */}
        <div className="bg-white border border-[#E7ECE8] rounded-[4px] overflow-hidden">
          <div className="bg-[#F4F6F4]/60 border-b border-[#E7ECE8] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#2F6B3C] shadow-xs font-semibold'
                    : 'text-[#6B7570] hover:text-[#1C2521]'
                }`}
              >
                ✏️ Markdown Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#2F6B3C] shadow-xs font-semibold'
                    : 'text-[#6B7570] hover:text-[#1C2521]'
                }`}
              >
                👁️ Live Markdown Preview
              </button>
            </div>
            <span className="text-[11px] text-[#6B7570]">Supports standard Markdown formatting</span>
          </div>

          <div className="p-6">
            {activeTab === 'edit' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write page content in Markdown format..."
                rows={18}
                disabled={saving}
                className="w-full font-mono text-xs text-[#1C2521] p-4 bg-white border border-[#E7ECE8] rounded-[4px] focus:outline-none focus:border-[#2F6B3C] focus:ring-1 focus:ring-[#2F6B3C] resize-y"
              />
            ) : (
              <div className="min-h-[350px] p-6 bg-[#FAFBF9] border border-[#E7ECE8] rounded-[4px] prose max-w-none text-sm text-[#1C2521] leading-relaxed">
                {content.trim() ? (
                  <ReactMarkdown>{content}</ReactMarkdown>
                ) : (
                  <p className="text-xs text-[#6B7570] italic">No content written yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/legal">
            <Button variant="secondary" size="sm" type="button" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button variant="primary" size="sm" type="submit" isLoading={saving}>
            {isNew ? 'Create Legal Page' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
