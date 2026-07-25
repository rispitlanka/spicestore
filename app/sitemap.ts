import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/seo'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const supabase = (await createClient()) as any

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]

  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, updated_at, created_at')
      .eq('is_active', true)

    if (categories && categories.length > 0) {
      categories.forEach((cat: { slug: string; updated_at?: string; created_at?: string }) => {
        routes.push({
          url: `${baseUrl}/category/${cat.slug}`,
          lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      })
    }

    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at, created_at')
      .eq('is_active', true)

    if (products && products.length > 0) {
      products.forEach((prod: { slug: string; updated_at?: string; created_at?: string }) => {
        routes.push({
          url: `${baseUrl}/products/${prod.slug}`,
          lastModified: prod.updated_at ? new Date(prod.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      })
    }

    const { data: legalPages } = await supabase
      .from('legal_pages')
      .select('slug, updated_at, created_at')
      .eq('is_published', true)

    if (legalPages && legalPages.length > 0) {
      legalPages.forEach((page: { slug: string; updated_at?: string; created_at?: string }) => {
        routes.push({
          url: `${baseUrl}/legal/${page.slug}`,
          lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.5,
        })
      })
    }
  } catch (err) {
    console.error('Error generating sitemap:', err)
  }

  return routes
}
