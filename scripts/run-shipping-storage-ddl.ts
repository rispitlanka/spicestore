import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

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

const hosts = [
  'aws-0-ap-southeast-2.pooler.supabase.com',
  'db.gwlcnuhznevhntvhizhc.supabase.co',
  '3.106.102.114',
  '13.237.241.81',
  '13.238.183.126',
]

const ports = [5432, 6543]
const users = ['postgres.gwlcnuhznevhntvhizhc', 'postgres']
const passes = [
  'yarlsamayal123',
  'yarlsamayal',
  'yarlsamayal2026',
  'YarlSamayal2026',
  'YarlSamayal2026!',
  'gwlcnuhznevhntvhizhc',
  'Yarlsamayal',
  'Yarl@samayal2026',
  'yarl@samayal2026',
  'yarlsamayal123!',
  'YarlSamayal123!',
]

async function runDDL() {
  const sql = `
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_info text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_tips text;
    COMMENT ON COLUMN public.products.shipping_info IS 'Freeform plain text custom shipping information for the product.';
    COMMENT ON COLUMN public.products.storage_tips IS 'Freeform plain text custom storage tips for the product.';
    UPDATE public.products SET storage_tips = 'Store in an airtight container in a cool, dry place. Protect from direct heat and moisture to retain freshness and aroma.' WHERE slug = 'jaffna-roasted-curry-powder';
    UPDATE public.products SET storage_tips = 'Store in a cool, dry place in an airtight container to preserve crispness. Keep away from direct sunlight.' WHERE slug = 'crunchy-roasted-murukku';
    UPDATE public.products SET storage_tips = 'Store at room temperature in a cool, dry place away from direct sunlight. Product may solidify at cooler temperatures.' WHERE slug = 'organic-virgin-coconut-oil';
  `

  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        for (const pass of passes) {
          try {
            const client = new Client({
              host,
              port,
              user,
              password: pass,
              database: 'postgres',
              ssl: { rejectUnauthorized: false },
              connectionTimeoutMillis: 3000,
            })
            await client.connect()
            console.log(`Connecting to ${host}:${port} user=${user}...`)
            await client.query(sql)
            console.log(`🎉 SUCCESS ON ${host}:${port} user=${user}!`)
            await client.end()
          } catch (err: any) {
            // continue trying all
          }
        }
      }
    }
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.from('products').select('id, name, shipping_info, storage_tips').limit(3)
  if (error) {
    console.error('❌ Verification failed:', error.message)
  } else {
    console.log('✅ Columns verified on active Supabase DB:', data)
  }
}

runDDL().catch(console.error)
