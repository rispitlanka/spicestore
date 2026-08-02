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

async function seedHeroData() {
  console.log('Seeding hero_slider_config in settings table...')
  const { error: setErr } = await supabase.from('settings').upsert(
    { key: 'hero_slider_config', value: { height_desktop_px: 400, height_mobile_px: 220 } },
    { onConflict: 'key' }
  )
  if (setErr) console.warn('Failed to seed hero_slider_config:', setErr.message)
  else console.log('✅ Seeded hero_slider_config setting')

  const initialSlide = {
    id: 'default-hero-slide-1',
    image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80',
    link_url: null,
    sort_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  }

  // Try hero_slides table if it exists
  const { error: slideTableErr } = await supabase.from('hero_slides').insert({
    image_url: initialSlide.image_url,
    link_url: initialSlide.link_url,
    sort_order: initialSlide.sort_order,
    is_active: initialSlide.is_active,
  })

  if (slideTableErr) {
    console.log('hero_slides table not created yet via DDL, seeding in settings key "hero_slides"...')
    const { error: settingsSlideErr } = await supabase.from('settings').upsert(
      { key: 'hero_slides', value: [initialSlide] },
      { onConflict: 'key' }
    )
    if (settingsSlideErr) console.warn('Failed to seed hero_slides in settings:', settingsSlideErr.message)
    else console.log('✅ Seeded default hero slide in settings table key "hero_slides"')
  } else {
    console.log('✅ Seeded default hero slide in hero_slides table!')
  }
}

seedHeroData().catch((err) => {
  console.error('Seed script failed:', err)
})
