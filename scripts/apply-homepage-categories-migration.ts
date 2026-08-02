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

async function seedHomepageCategories() {
  console.log('Seeding initial homepage_categories in settings fallback...')
  
  // Fetch active categories to link
  const { data: categories } = await supabase.from('categories').select('id, name, slug').eq('is_active', true)
  
  // Try homepage_categories DB table check
  const { data: dbData, error: dbErr } = await supabase.from('homepage_categories').select('*')
  
  if (dbErr) {
    console.log('DB Table note:', dbErr.message)
  } else {
    console.log('✅ homepage_categories table exists! Current count:', dbData?.length ?? 0)
  }

  // Ensure settings key 'homepage_categories' exists
  const { data: existingSetting } = await supabase.from('settings').select('value').eq('key', 'homepage_categories').maybeSingle()
  if (!existingSetting) {
    const { error: setErr } = await supabase.from('settings').upsert({
      key: 'homepage_categories',
      value: [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })
    if (setErr) console.warn('Settings fallback setup warning:', setErr.message)
    else console.log('✅ Initialized "homepage_categories" settings fallback row.')
  }
}

seedHomepageCategories().catch(console.error)
