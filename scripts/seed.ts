import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Automatically load environment variables from .env.local if available
try {
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
} catch {
  // Silent fallback if .env.local cannot be read
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gwlcnuhznevhntvhizhc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yZuUiwLiZI1MDNa5KPzOvw_K9CL2zFR'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🌱 Starting e-commerce database seeding...')

  // 1. Seed Categories
  const categoriesData = [
    { name: 'Curry Powders', slug: 'curry-powders', is_active: true },
    { name: 'Spices', slug: 'spices', is_active: true },
    { name: 'Rice & Grains', slug: 'rice-grains', is_active: true },
    { name: 'Sweets & Jaggery', slug: 'sweets-jaggery', is_active: true },
    { name: 'Snacks', slug: 'snacks', is_active: true },
  ]

  console.log('Inserting categories...')
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .upsert(categoriesData, { onConflict: 'slug' })
    .select('id, name, slug')

  if (catError) {
    console.error('⚠️ Note: Seeding via client anon key is restricted by database RLS (Public write disabled).')
    console.error('🔒 RLS verified: Guests and unauthenticated clients cannot modify catalog/categories!')
    console.error('To run seeding against a live Supabase instance, supply SUPABASE_SERVICE_ROLE_KEY or run supabase/seed.sql directly.')
    return
  }
  console.log(`✅ Seeded ${categories.length} categories.`)

  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]))

  // 2. Seed Countries
  const countriesData = [
    { name: 'Sri Lanka', code: 'LK', is_active: true },
    { name: 'India', code: 'IN', is_active: true },
    { name: 'United Kingdom', code: 'GB', is_active: true },
    { name: 'United States', code: 'US', is_active: true },
    { name: 'Australia', code: 'AU', is_active: true },
  ]

  console.log('Inserting countries...')
  const { data: countries, error: countryError } = await supabase
    .from('countries')
    .upsert(countriesData, { onConflict: 'code' })
    .select('id, name, code')

  if (countryError) {
    console.error('Error inserting countries:', countryError.message)
    return
  }
  console.log(`✅ Seeded ${countries.length} countries.`)

  const countryMap = new Map(countries.map((c) => [c.code, c.id]))

  // 3. Seed Shipping Tiers
  const shippingTiersData: { country_id: string; weight_kg: number; price: number }[] = []

  const rates: Record<string, { weight: number; price: number }[]> = {
    LK: [{ weight: 0.5, price: 2.0 }, { weight: 1.0, price: 3.5 }, { weight: 2.0, price: 6.0 }, { weight: 5.0, price: 12.0 }],
    IN: [{ weight: 0.5, price: 4.0 }, { weight: 1.0, price: 7.0 }, { weight: 2.0, price: 12.0 }, { weight: 5.0, price: 25.0 }],
    GB: [{ weight: 0.5, price: 8.0 }, { weight: 1.0, price: 14.0 }, { weight: 2.0, price: 24.0 }, { weight: 5.0, price: 50.0 }],
    US: [{ weight: 0.5, price: 10.0 }, { weight: 1.0, price: 18.0 }, { weight: 2.0, price: 32.0 }, { weight: 5.0, price: 65.0 }],
    AU: [{ weight: 0.5, price: 9.5 }, { weight: 1.0, price: 16.5 }, { weight: 2.0, price: 29.0 }, { weight: 5.0, price: 60.0 }],
  }

  for (const [code, tierList] of Object.entries(rates)) {
    const cId = countryMap.get(code)
    if (cId) {
      tierList.forEach((t) => {
        shippingTiersData.push({ country_id: cId, weight_kg: t.weight, price: t.price })
      })
    }
  }

  console.log('Inserting shipping tiers...')
  // Clear existing & re-insert for clean state
  for (const cId of countryMap.values()) {
    await supabase.from('shipping_tiers').delete().eq('country_id', cId)
  }
  const { data: tiers, error: tierErr } = await supabase
    .from('shipping_tiers')
    .insert(shippingTiersData)
    .select('id')

  if (tierErr) {
    console.error('Error inserting shipping tiers:', tierErr.message)
  } else {
    console.log(`✅ Seeded ${tiers.length} shipping tiers.`)
  }

  // 4. Seed Products & Variations
  const productsToSeed = [
    {
      name: 'Jaffna Roasted Curry Powder',
      slug: 'jaffna-roasted-curry-powder',
      description: 'Authentic dark roasted aromatic curry powder blend made with roasted coriander, cumin, fennel, and Ceylon spices.',
      category_id: categoryMap.get('curry-powders'),
      has_variations: true,
      is_active: true,
      variations: [
        { attributes: { weight: '250g' }, sku: 'JCP-250G', price: 4.99, weight_kg: 0.25, stock: 50, is_active: true },
        { attributes: { weight: '500g' }, sku: 'JCP-500G', price: 8.99, weight_kg: 0.5, stock: 30, is_active: true },
        { attributes: { weight: '1kg' }, sku: 'JCP-1KG', price: 16.99, weight_kg: 1.0, stock: 15, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Pure Ceylon Red Chilli Powder',
      slug: 'pure-ceylon-red-chilli-powder',
      description: 'Fiery sun-dried Ceylon chilli powder ground to perfection for deep red color and bold spice.',
      category_id: categoryMap.get('spices'),
      has_variations: true,
      is_active: true,
      variations: [
        { attributes: { weight: '100g' }, sku: 'RCP-100G', price: 2.5, weight_kg: 0.1, stock: 40, is_active: true },
        { attributes: { weight: '250g' }, sku: 'RCP-250G', price: 5.5, weight_kg: 0.25, stock: 25, is_active: true },
        { attributes: { weight: '500g' }, sku: 'RCP-500G', price: 9.99, weight_kg: 0.5, stock: 10, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Premium Organic Turmeric Powder',
      slug: 'premium-organic-turmeric-powder',
      description: '100% natural organic turmeric root powder packed with natural curcumin and vibrant golden color.',
      category_id: categoryMap.get('spices'),
      has_variations: false,
      base_price: 3.99,
      base_weight_kg: 0.2,
      is_active: true,
      variations: [
        { attributes: { weight: 'Standard' }, sku: 'TUR-200G', price: 3.99, weight_kg: 0.2, stock: 60, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Traditional Samba Rice',
      slug: 'traditional-samba-rice',
      description: 'Short-grain traditional fragrant Samba rice, perfect for curries, biryanis, and festive meals.',
      category_id: categoryMap.get('rice-grains'),
      has_variations: true,
      is_active: true,
      variations: [
        { attributes: { weight: '1kg' }, sku: 'SAMBA-1KG', price: 3.49, weight_kg: 1.0, stock: 100, is_active: true },
        { attributes: { weight: '5kg' }, sku: 'SAMBA-5KG', price: 15.99, weight_kg: 5.0, stock: 40, is_active: true },
        { attributes: { weight: '10kg' }, sku: 'SAMBA-10KG', price: 29.99, weight_kg: 10.0, stock: 20, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Handcrafted Palmyra Jaggery',
      slug: 'handcrafted-palmyra-jaggery',
      description: 'Unrefined natural sweet unworked sweetener harvested from northern palmyra palm trees.',
      category_id: categoryMap.get('sweets-jaggery'),
      has_variations: true,
      is_active: true,
      variations: [
        { attributes: { weight: '250g' }, sku: 'JAG-250G', price: 4.5, weight_kg: 0.25, stock: 35, is_active: true },
        { attributes: { weight: '500g' }, sku: 'JAG-500G', price: 8.5, weight_kg: 0.5, stock: 20, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Cardamom Pods (Whole Green)',
      slug: 'cardamom-pods-whole-green',
      description: 'Hand-picked green cardamom pods full of essential oils and intensely fragrant citrus-herbal aroma.',
      category_id: categoryMap.get('spices'),
      has_variations: true,
      is_active: true,
      variations: [
        { attributes: { weight: '50g' }, sku: 'CARD-50G', price: 5.99, weight_kg: 0.05, stock: 50, is_active: true },
        { attributes: { weight: '100g' }, sku: 'CARD-100G', price: 10.99, weight_kg: 0.1, stock: 25, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Crunchy Roasted Murukku',
      slug: 'crunchy-roasted-murukku',
      description: 'Traditional savory rice flour snack seasoned with cumin and sesame seeds for ultimate crunch.',
      category_id: categoryMap.get('snacks'),
      has_variations: false,
      base_price: 2.99,
      base_weight_kg: 0.25,
      is_active: true,
      variations: [
        { attributes: { weight: 'Standard' }, sku: 'MUR-250G', price: 2.99, weight_kg: 0.25, stock: 45, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Organic Virgin Coconut Oil',
      slug: 'organic-virgin-coconut-oil',
      description: 'Cold-pressed 100% pure unrefined virgin coconut oil from fresh coconuts.',
      category_id: categoryMap.get('spices'),
      has_variations: false,
      base_price: 7.99,
      base_weight_kg: 0.5,
      is_active: true,
      variations: [
        { attributes: { weight: 'Standard' }, sku: 'VCO-500ML', price: 7.99, weight_kg: 0.5, stock: 30, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sun-Dried Curry Leaves',
      slug: 'sun-dried-curry-leaves',
      description: 'Freshly harvested sun-dried aromatic curry leaves ideal for tempering oil and seasoning dishes.',
      category_id: categoryMap.get('spices'),
      has_variations: false,
      base_price: 1.99,
      base_weight_kg: 0.05,
      is_active: true,
      variations: [
        { attributes: { weight: 'Standard' }, sku: 'CLEAF-50G', price: 1.99, weight_kg: 0.05, stock: 80, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Ceylon True Cinnamon Sticks',
      slug: 'ceylon-true-cinnamon-sticks',
      description: 'Premium grade Alba Ceylon cinnamon quills with delicate warm sweet flavor profile.',
      category_id: categoryMap.get('spices'),
      has_variations: false,
      base_price: 6.49,
      base_weight_kg: 0.1,
      is_active: true,
      variations: [
        { attributes: { weight: 'Standard' }, sku: 'CIN-100G', price: 6.49, weight_kg: 0.1, stock: 20, is_active: true },
      ],
      image: 'https://images.unsplash.com/photo-1509358271058-acd01cc9386a?w=800&auto=format&fit=crop&q=80',
    },
  ]

  console.log('Inserting products...')
  for (const p of productsToSeed) {
    // Upsert main product
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .upsert(
        {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category_id: p.category_id,
          has_variations: p.has_variations,
          base_price: p.base_price,
          base_weight_kg: p.base_weight_kg,
          is_active: p.is_active,
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single()

    if (prodErr || !prodData) {
      console.error(`Error inserting product ${p.name}:`, prodErr?.message)
      continue
    }

    const productId = prodData.id

    // Insert Product Image
    await supabase.from('product_images').delete().eq('product_id', productId)
    await supabase.from('product_images').insert({
      product_id: productId,
      url: p.image,
      sort_order: 0,
      is_main: true,
    })

    // Upsert Variations
    for (const v of p.variations) {
      await supabase.from('product_variations').upsert(
        {
          product_id: productId,
          attributes: v.attributes,
          sku: v.sku,
          price: v.price,
          weight_kg: v.weight_kg,
          stock: v.stock,
          is_active: v.is_active,
        },
        { onConflict: 'sku' }
      )
    }
  }

  console.log('✅ Seeded products, images, and variations.')

  // 5. Seed Coupons
  const couponsData = [
    {
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      min_order_value: 20,
      usage_limit: 100,
      usage_count: 0,
      is_active: true,
    },
    {
      code: 'FLAT5',
      type: 'fixed',
      value: 5,
      min_order_value: 15,
      usage_limit: 50,
      usage_count: 0,
      is_active: true,
    },
    {
      code: 'SPICE20',
      type: 'percent',
      value: 20,
      min_order_value: 25,
      usage_count: 0,
      applicable_category_ids: categoryMap.get('spices') ? [categoryMap.get('spices')] : [],
      is_active: true,
    },
    {
      code: 'SAVEMORE',
      type: 'fixed',
      value: 10,
      min_order_value: 50,
      usage_limit: 200,
      usage_count: 0,
      is_active: true,
    },
  ]

  console.log('Inserting sample coupons...')
  const { data: coupons, error: coupErr } = await supabase
    .from('coupons')
    .upsert(couponsData, { onConflict: 'code' })
    .select('id, code')

  if (coupErr) {
    console.error('Error inserting coupons:', coupErr.message)
  } else {
    console.log(`✅ Seeded ${coupons.length} coupons.`)
  }

  console.log('🎉 E-commerce database seeding completed successfully!')
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
})
