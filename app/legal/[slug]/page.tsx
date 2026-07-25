import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/server'
import { LegalPage } from '@/types/database'
import { getSiteSettings } from '@/lib/settings'
import { stripMarkdown, truncateText } from '@/lib/seo'

export const revalidate = 3600 // Cache for 1 hour

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getLegalPage(slug: string): Promise<LegalPage | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('legal_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (err) {
    console.error('Error fetching legal page:', err)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const page = await getLegalPage(resolvedParams.slug)
  const settings = await getSiteSettings()
  const siteIdentity = settings.site_identity

  const siteTitle = siteIdentity?.site_title?.trim() || 'Yarl Samayal'
  const defaultDescription =
    siteIdentity?.meta_description?.trim() ||
    'Authentic Jaffna spice blends, savory snacks, and traditional Sri Lankan delicacies.'

  if (!page) {
    return {
      title: { absolute: `Page Not Found | ${siteTitle}` },
      description: defaultDescription,
    }
  }

  const titleString = `${page.title} | ${siteTitle}`
  const rawDesc = page.content ? stripMarkdown(page.content) : ''
  const description = rawDesc ? truncateText(rawDesc, 155) : defaultDescription

  return {
    title: { absolute: titleString },
    description,
    openGraph: {
      title: titleString,
      description,
      type: 'website',
    },
  }
}

export default async function PublicLegalPage({ params }: PageProps) {
  const resolvedParams = await params
  const page = await getLegalPage(resolvedParams.slug)

  if (!page) {
    notFound()
  }

  return (
    <div className="bg-white min-h-screen py-10 sm:py-16 font-sans text-[#1C2521]">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="border-b border-[#E7ECE8] pb-6 mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3C] block mb-1">
            Store Policies & Legal Information
          </span>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[#1C2521]">
            {page.title}
          </h1>
          <p className="mt-2 text-xs text-[#6B7570]">
            Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        {/* Article Body */}
        <article className="prose prose-slate max-w-none text-sm text-[#1C2521] leading-relaxed space-y-6">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl sm:text-2xl font-semibold text-[#1C2521] mt-8 mb-4 border-b border-[#E7ECE8] pb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-[#1C2521] mt-6 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-[#1C2521] mt-4 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-[#1C2521] leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[#1C2521] mb-4 pl-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-[#1C2521] mb-4 pl-2">
                  {children}
                </ol>
              ),
              hr: () => <hr className="border-[#E7ECE8] my-6" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#2F6B3C] pl-4 italic text-[#6B7570] my-4">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-[#F4F6F4] px-1.5 py-0.5 rounded font-mono text-xs text-[#2F6B3C]">
                  {children}
                </code>
              ),
            }}
          >
            {page.content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
