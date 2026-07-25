'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LegalPage } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

export default function AdminLegalPagesIndex() {
  const [pages, setPages] = useState<LegalPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLegalPages = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient() as any
      const { data, error: err } = await supabase
        .from('legal_pages')
        .select('*')
        .order('updated_at', { ascending: false })

      if (err) throw err
      setPages(data || [])
    } catch (err: unknown) {
      console.error('Error fetching legal pages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load legal pages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLegalPages()
  }, [])

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-[#1C2521]">
      {/* Top Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Legal & Policy Pages
          </h1>
          <p className="mt-1 text-xs text-[#6B7570]">
            Manage store policies, privacy guidelines, and terms of service. Content is stored as Markdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchLegalPages} disabled={loading}>
            Refresh
          </Button>

          <Link href="/admin/legal/new/edit">
            <Button variant="primary" size="sm">
              + Add Legal Page
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-sm text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-xs text-[#6B7570]">
          <Spinner size="sm" className="mr-2" /> Loading legal pages...
        </div>
      ) : pages.length === 0 ? (
        <div className="border border-[#E7ECE8] rounded-[4px] p-12 text-center bg-white space-y-3">
          <p className="text-sm font-medium text-[#1C2521]">No legal pages found</p>
          <p className="text-xs text-[#6B7570]">Create your first policy page to replace hardcoded content.</p>
          <Link href="/admin/legal/new/edit" className="inline-block pt-2">
            <Button variant="primary" size="sm">
              + Add Legal Page
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-[#E7ECE8] rounded-[4px] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F4]/60 border-b border-[#E7ECE8] text-[#6B7570] font-semibold">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7ECE8]">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-[#1C2521]">
                      <Link
                        href={`/admin/legal/${page.slug}/edit`}
                        className="hover:text-[#2F6B3C] hover:underline"
                      >
                        {page.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[#6B7570]">
                      /legal/{page.slug}
                    </td>
                    <td className="px-4 py-3.5">
                      {page.is_published ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-50 text-[#2F6B3C] border border-green-200">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-[#6B7570] border border-gray-200">
                          Draft (Unpublished)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#6B7570]">
                      {new Date(page.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {page.is_published && (
                        <Link
                          href={`/legal/${page.slug}`}
                          target="_blank"
                          className="text-xs text-[#6B7570] hover:text-[#1C2521] hover:underline mr-3"
                        >
                          View Live ↗
                        </Link>
                      )}
                      <Link href={`/admin/legal/${page.slug}/edit`}>
                        <Button variant="secondary" size="sm" className="min-h-[32px] px-3">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
