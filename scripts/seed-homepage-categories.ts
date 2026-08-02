import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
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
} catch (err) {
  console.error('Error loading .env.local:', err)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedShowcase() {
  console.log('Fetching active categories...')
  const { data: categories } = await supabase.from('categories').select('*').eq('is_active', true)

  if (!categories || categories.length === 0) {
    console.log('No active categories found.')
    return
  }

  console.log('Found categories:', categories.map((c) => c.name))

  const sampleImages = [
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1509358211425-24d08435f45f?auto=format&fit=crop&w=600&q=80',
  ]

  const showcaseItems = categories.slice(0, 4).map((cat, idx) => ({
    id: `showcase-${cat.id}`,
    category_id: cat.id,
    image_url: sampleImages[idx % sampleImages.length],
    cloudinary_public_id: null,
    sort_order: idx,
    is_active: true,
    created_at: new Date().toISOString(),
    categories: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      is_active: cat.is_active,
    },
  }))

  console.log('Seeding initial showcase items in settings fallback...')
  const { error } = await supabase.from('settings').upsert(
    {
      key: 'homepage_categories',
      value: showcaseItems,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('Failed to seed showcase:', error.message)
  } else {
    console.log('✅ Seeded 4 initial homepage showcase category tiles successfully!')
  }
}

seedShowcase().catch(console.error)
