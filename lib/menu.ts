import { createClient } from '@/lib/supabase/client'

export type LinkType = 'category' | 'legal_page' | 'custom_url' | 'product'
export type MenuLocation = 'header' | 'footer_shop'

export interface MenuItem {
  id: string
  label: string
  link_type: LinkType
  category_id?: string | null
  legal_page_slug?: string | null
  custom_url?: string | null
  product_id?: string | null
  sort_order: number
  is_visible: boolean
  menu_location: MenuLocation
  created_at?: string
  category_slug?: string | null
  product_slug?: string | null
}

export interface ResolvedMenuItem extends MenuItem {
  href: string
}

export function resolveMenuItemHref(item: MenuItem): string {
  switch (item.link_type) {
    case 'category':
      return item.category_slug ? `/category/${item.category_slug}` : '#'
    case 'legal_page':
      return item.legal_page_slug ? `/legal/${item.legal_page_slug}` : '#'
    case 'product':
      return item.product_slug ? `/products/${item.product_slug}` : '#'
    case 'custom_url':
    default:
      return item.custom_url || '/'
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchAllMenuItems(location?: MenuLocation): Promise<MenuItem[]> {
  try {
    const supabase = createClient() as any

    // 1. Try querying menu_items table
    let query = supabase
      .from('menu_items')
      .select(`
        id,
        label,
        link_type,
        category_id,
        legal_page_slug,
        custom_url,
        product_id,
        sort_order,
        is_visible,
        menu_location,
        created_at,
        categories ( slug ),
        products ( slug )
      `)

    if (location) {
      query = query.eq('menu_location', location)
    }

    const { data: dbItems, error: dbError } = await query.order('sort_order', { ascending: true })

    if (!dbError && dbItems && dbItems.length > 0) {
      return dbItems.map((item: any) => ({
        id: item.id,
        label: item.label,
        link_type: item.link_type,
        category_id: item.category_id,
        legal_page_slug: item.legal_page_slug,
        custom_url: item.custom_url,
        product_id: item.product_id,
        sort_order: item.sort_order,
        is_visible: item.is_visible,
        menu_location: (item.menu_location as MenuLocation) || 'header',
        created_at: item.created_at,
        category_slug: item.categories?.slug || null,
        product_slug: item.products?.slug || null,
      }))
    }

    // 2. Fallback to settings table
    const targetKey = location ? `menu_items_${location}` : 'menu_items'
    const { data: settingRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', targetKey)
      .single()

    let rawList: MenuItem[] = []

    if (settingRow?.value && Array.isArray(settingRow.value)) {
      rawList = settingRow.value
    } else {
      // General 'menu_items' fallback
      const { data: genRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'menu_items')
        .single()

      if (genRow?.value && Array.isArray(genRow.value)) {
        rawList = genRow.value
        if (location) {
          rawList = rawList.filter((i) => (i.menu_location || 'header') === location)
        }
      }
    }

    if (rawList.length > 0) {
      // Hydrate category_slug / product_slug for referenced IDs
      const categoryIds = rawList.map((i) => i.category_id).filter(Boolean) as string[]
      const productIds = rawList.map((i) => i.product_id).filter(Boolean) as string[]

      let catMap = new Map<string, string>()
      let prodMap = new Map<string, string>()

      if (categoryIds.length > 0) {
        const { data: cats } = await supabase
          .from('categories')
          .select('id, slug')
          .in('id', categoryIds)
        if (cats) {
          catMap = new Map(cats.map((c: any) => [c.id, c.slug]))
        }
      }

      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, slug')
          .in('id', productIds)
        if (prods) {
          prodMap = new Map(prods.map((p: any) => [p.id, p.slug]))
        }
      }

      return rawList.map((item) => ({
        ...item,
        menu_location: item.menu_location || location || 'header',
        category_slug: item.category_id ? catMap.get(item.category_id) || null : null,
        product_slug: item.product_id ? prodMap.get(item.product_id) || null : null,
      }))
    }
  } catch (err) {
    console.error('Error fetching menu items:', err)
  }

  return []
}

export async function fetchVisibleNavMenuItems(location: MenuLocation = 'header'): Promise<ResolvedMenuItem[]> {
  const items = await fetchAllMenuItems(location)
  const visible = items.filter((i) => i.is_visible)

  return visible.map((item) => ({
    ...item,
    href: resolveMenuItemHref(item),
  }))
}
