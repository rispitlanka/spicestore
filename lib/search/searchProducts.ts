import { createClient } from '@/lib/supabase/server'
import { getProductCardImages } from '@/lib/seo'

export interface SearchProductItem {
  id: string
  name: string
  slug: string
  description: string | null
  base_price: number | null
  base_weight_kg: number | null
  has_variations: boolean
  is_active: boolean
  category_id: string | null
  category_name: string | null
  category_slug: string | null
  min_price: number
  max_price: number
  effectivePrice: number
  total_stock: number
  is_out_of_stock: boolean
  image_url: string | null
  cloudinary_public_id?: string | null
  secondary_image_url?: string | null
  secondary_cloudinary_public_id?: string | null
  rank?: number
}

export interface MatchedCategory {
  id: string
  name: string
  slug: string
}

export interface SearchResult {
  query: string
  products: SearchProductItem[]
  matchedCategory: MatchedCategory | null
  totalMatches: number
}

export async function searchProducts(rawQuery: string): Promise<SearchResult> {
  const query = rawQuery.trim()
  if (!query) {
    return {
      query: '',
      products: [],
      matchedCategory: null,
      totalMatches: 0,
    }
  }

  const supabase = (await createClient()) as ReturnType<typeof createClient> extends Promise<infer T> ? T : never

  // 1. Check for matching category
  let matchedCategory: MatchedCategory | null = null
  try {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .limit(1)

    if (categoryData && categoryData.length > 0) {
      matchedCategory = categoryData[0] as MatchedCategory
    }
  } catch (err) {
    console.error('Error fetching category match:', err)
  }

  // 2. Try RPC function search_products first
  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('search_products', {
      p_query: query,
    })

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const products: SearchProductItem[] = rpcData.map((item: Record<string, unknown>) => {
        const minP = Number(item.min_price || item.base_price || 0)
        const maxP = Number(item.max_price || item.base_price || 0)
        const effP = item.has_variations && minP > 0 ? minP : Number(item.base_price || minP)

        return {
          id: String(item.id),
          name: String(item.name),
          slug: String(item.slug),
          description: item.description ? String(item.description) : null,
          base_price: item.base_price ? Number(item.base_price) : null,
          base_weight_kg: item.base_weight_kg ? Number(item.base_weight_kg) : null,
          has_variations: Boolean(item.has_variations),
          is_active: Boolean(item.is_active),
          category_id: item.category_id ? String(item.category_id) : null,
          category_name: item.category_name ? String(item.category_name) : null,
          category_slug: item.category_slug ? String(item.category_slug) : null,
          min_price: minP,
          max_price: maxP,
          effectivePrice: effP,
          total_stock: Number(item.total_stock || 0),
          is_out_of_stock: Boolean(item.is_out_of_stock),
          image_url: item.image_url ? String(item.image_url) : null,
          rank: Number(item.rank || 0),
        }
      })

      return {
        query,
        products,
        matchedCategory,
        totalMatches: products.length,
      }
    }
  } catch (err) {
    console.warn('RPC search_products not available, using client query fallback:', err)
  }

  // 3. Fallback PostgREST query if RPC unavailable or returned empty
  try {
    const { data: rawProducts, error: queryError } = await supabase
      .from('products')
      .select(`
        *,
        categories (id, name, slug),
        product_images (id, url, sort_order, is_main, cloudinary_public_id, variation_id),
        product_variations (id, price, stock, is_active)
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (queryError || !rawProducts) {
      console.error('Error in search query fallback:', queryError)
      return {
        query,
        products: [],
        matchedCategory,
        totalMatches: 0,
      }
    }

    const lowerQuery = query.toLowerCase()

    const products: SearchProductItem[] = rawProducts
      .map((p: any) => {
        const activeVariations = (p.product_variations || []).filter((v: any) => v.is_active)
        const { mainImage, hoverImage } = getProductCardImages(p)

        let minPrice = 0
        let maxPrice = 0
        let totalStock = 0

        if (p.has_variations && activeVariations.length > 0) {
          const prices = activeVariations.map((v: any) => Number(v.price))
          minPrice = Math.min(...prices)
          maxPrice = Math.max(...prices)
          totalStock = activeVariations.reduce((sum: number, v: any) => sum + Number(v.stock || 0), 0)
        } else {
          minPrice = Number(p.base_price || 0)
          maxPrice = minPrice
          totalStock = 99 // default stock for simple products
        }

        const effectivePrice = p.has_variations && minPrice > 0 ? minPrice : Number(p.base_price || minPrice)
        const isOutOfStock =
          !p.is_active ||
          (p.has_variations && activeVariations.length > 0
            ? activeVariations.every((v: any) => Number(v.stock || 0) <= 0)
            : false)

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || null,
          base_price: p.base_price ? Number(p.base_price) : null,
          base_weight_kg: p.base_weight_kg ? Number(p.base_weight_kg) : null,
          has_variations: Boolean(p.has_variations),
          is_active: Boolean(p.is_active),
          category_id: p.categories?.id || null,
          category_name: p.categories?.name || null,
          category_slug: p.categories?.slug || null,
          min_price: minPrice,
          max_price: maxPrice,
          effectivePrice,
          total_stock: totalStock,
          is_out_of_stock: isOutOfStock,
          image_url: mainImage ? mainImage.url : null,
          cloudinary_public_id: mainImage ? mainImage.cloudinary_public_id : null,
          secondary_image_url: hoverImage ? hoverImage.url : null,
          secondary_cloudinary_public_id: hoverImage ? hoverImage.cloudinary_public_id : null,
        }
      })
      // Sort exact or start matches first
      .sort((a: SearchProductItem, b: SearchProductItem) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        const aStarts = aName.startsWith(lowerQuery)
        const bStarts = bName.startsWith(lowerQuery)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return aName.localeCompare(bName)
      })

    return {
      query,
      products,
      matchedCategory,
      totalMatches: products.length,
    }
  } catch (err) {
    console.error('Error during search execution:', err)
    return {
      query,
      products: [],
      matchedCategory,
      totalMatches: 0,
    }
  }
}
