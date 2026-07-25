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
  // Silent fallback
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gwlcnuhznevhntvhizhc.supabase.co'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_yZuUiwLiZI1MDNa5KPzOvw_K9CL2zFR'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndMigrateImages() {
  console.log('🔍 Checking product images in database for variation-scoped main flags...')

  // 1. Fetch all product images
  const { data: images, error } = await supabase
    .from('product_images')
    .select('*')

  if (error) {
    console.error('❌ Error fetching product images:', error.message)
    return
  }

  console.log(`📸 Found ${images.length} total product image records in database.`)

  let supabaseStorageCount = 0
  let cloudinaryCount = 0
  let externalUrlCount = 0
  let missingMainScopeCount = 0

  // Group images by composite scope key: `${product_id}:${variation_id || 'DEFAULT'}`
  const imagesByScope = new Map<string, any[]>()

  images.forEach((img) => {
    if (img.url.includes('supabase.co/storage') || img.url.includes('/product_images/')) {
      supabaseStorageCount++
    } else if (img.url.includes('cloudinary.com') || img.cloudinary_public_id) {
      cloudinaryCount++
    } else {
      externalUrlCount++
    }

    const scopeKey = `${img.product_id}:${img.variation_id || 'DEFAULT'}`
    const list = imagesByScope.get(scopeKey) || []
    list.push(img)
    imagesByScope.set(scopeKey, list)
  })

  console.log('\n📊 Image Storage Breakdown:')
  console.log(`   • Supabase Storage Assets: ${supabaseStorageCount}`)
  console.log(`   • Cloudinary Assets:       ${cloudinaryCount}`)
  console.log(`   • External / Other URLs:    ${externalUrlCount}`)

  // 2. Ensure each scope (Product default or specific variation) has an image with is_main = true
  for (const [scopeKey, scopeImages] of imagesByScope.entries()) {
    const hasMain = scopeImages.some((i) => i.is_main)
    if (!hasMain && scopeImages.length > 0) {
      missingMainScopeCount++
      scopeImages.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const targetMain = scopeImages[0]

      const { error: updateErr } = await supabase
        .from('product_images')
        .update({ is_main: true })
        .eq('id', targetMain.id)

      if (!updateErr) {
        console.log(`  ✓ Updated primary thumbnail (is_main = true) for scope [${scopeKey}]`)
      }
    }
  }

  console.log(`\n✅ Image check completed. Updated ${missingMainScopeCount} scopes to have dedicated is_main = true.`)
  console.log('💡 Scoping Note: Each variation and product-level default independently retains its main thumbnail.')
}

checkAndMigrateImages().catch((err) => {
  console.error('Migration check failed:', err)
})
