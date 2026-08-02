import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

async function verifyDB() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('================ COMPREHENSIVE DB AUDIT ================')
  const tables = [
    'categories',
    'products',
    'product_images',
    'product_variations',
    'customer_profiles',
    'customer_addresses',
    'orders',
    'order_items',
    'settings',
    'coupons',
    'exchange_rates',
    'legal_pages',
    'order_email_log',
    'hero_slides',
    'homepage_categories'
  ]

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1)
    if (error) {
      console.log(`❌ Table '${t}': ERROR - ${error.code} ${error.message}`)
    } else {
      const row = data && data[0] ? data[0] : null
      if (row) {
        console.log(`✅ Table '${t}': OK - columns [${Object.keys(row).join(', ')}]`)
      } else {
        // Table exists but 0 rows. Insert temporary dummy and roll back or select columns via dummy insert error
        console.log(`✅ Table '${t}': Exists (0 rows)`)
      }
    }
  }
}

verifyDB().catch(console.error)
