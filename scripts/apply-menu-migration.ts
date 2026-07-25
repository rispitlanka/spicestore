import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=')
      const key = trimmed.substring(0, idx).trim()
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedInitialMenuItems() {
  console.log('Fetching category IDs for menu seeding...')
  const { data: categories } = await supabase.from('categories').select('id, slug, name')
  const catMap = new Map(categories?.map((c) => [c.slug, c.id]) || [])

  const headerItems = [
    {
      id: 'hdr-1',
      label: 'Curry Powders',
      link_type: 'category',
      category_id: catMap.get('curry-powders') || null,
      sort_order: 0,
      is_visible: true,
      menu_location: 'header',
    },
    {
      id: 'hdr-2',
      label: 'Spices',
      link_type: 'category',
      category_id: catMap.get('spices') || null,
      sort_order: 1,
      is_visible: true,
      menu_location: 'header',
    },
    {
      id: 'hdr-3',
      label: 'Snacks',
      link_type: 'category',
      category_id: catMap.get('snacks') || null,
      sort_order: 2,
      is_visible: true,
      menu_location: 'header',
    },
    {
      id: 'hdr-4',
      label: 'Preserves',
      link_type: 'category',
      category_id: catMap.get('preserves') || null,
      sort_order: 3,
      is_visible: true,
      menu_location: 'header',
    },
    {
      id: 'hdr-5',
      label: 'All Products',
      link_type: 'custom_url',
      custom_url: '/',
      sort_order: 4,
      is_visible: true,
      menu_location: 'header',
    },
  ]

  const footerShopItems = [
    {
      id: 'ftr-1',
      label: 'Curry Powders',
      link_type: 'category',
      category_id: catMap.get('curry-powders') || null,
      sort_order: 0,
      is_visible: true,
      menu_location: 'footer_shop',
    },
    {
      id: 'ftr-2',
      label: 'Spices & Seasoning',
      link_type: 'category',
      category_id: catMap.get('spices') || null,
      sort_order: 1,
      is_visible: true,
      menu_location: 'footer_shop',
    },
    {
      id: 'ftr-3',
      label: 'Authentic Snacks',
      link_type: 'category',
      category_id: catMap.get('snacks') || null,
      sort_order: 2,
      is_visible: true,
      menu_location: 'footer_shop',
    },
    {
      id: 'ftr-4',
      label: 'Preserves & Chutneys',
      link_type: 'category',
      category_id: catMap.get('preserves') || null,
      sort_order: 3,
      is_visible: true,
      menu_location: 'footer_shop',
    },
    {
      id: 'ftr-5',
      label: 'All Products',
      link_type: 'custom_url',
      custom_url: '/',
      sort_order: 4,
      is_visible: true,
      menu_location: 'footer_shop',
    },
  ]

  // Try inserting into menu_items table
  const allRows = [...headerItems, ...footerShopItems]
  const { error: tableError } = await supabase.from('menu_items').insert(
    allRows.map((item) => ({
      label: item.label,
      link_type: item.link_type,
      category_id: item.category_id,
      custom_url: item.custom_url || null,
      sort_order: item.sort_order,
      is_visible: item.is_visible,
      menu_location: item.menu_location,
    }))
  )

  if (tableError) {
    console.log('menu_items table insert note:', tableError.message)
  } else {
    console.log('✅ Initial rows seeded to menu_items table!')
  }

  // Also seed to settings table fallback
  await supabase.from('settings').upsert({
    key: 'menu_items_header',
    value: headerItems,
    updated_at: new Date().toISOString(),
  })

  await supabase.from('settings').upsert({
    key: 'menu_items_footer_shop',
    value: footerShopItems,
    updated_at: new Date().toISOString(),
  })

  // Combined fallback
  await supabase.from('settings').upsert({
    key: 'menu_items',
    value: allRows,
    updated_at: new Date().toISOString(),
  })

  console.log('✅ Dual menu location seeding complete (header & footer_shop)!')
}

seedInitialMenuItems().catch(console.error)
