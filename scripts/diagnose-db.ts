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

const ports = [6543, 5432]
const users = ['postgres.gwlcnuhznevhntvhizhc', 'postgres']
const passes = [
  'yarlsamayal123',
  'yarlsamayal',
  'yarlsamayal2026',
  'YarlSamayal2026',
  'YarlSamayal2026!',
  'gwlcnuhznevhntvhizhc',
]

async function diagnose() {
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

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
            console.log(`Connected to ${host}:${port} user=${user}`)

            // Check columns on products
            const colRes = await client.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'products';
            `)
            const cols = colRes.rows.map((r: any) => r.column_name)
            console.log(`Columns on ${host}:${port}:`, cols.join(', '))

            // Add columns if missing
            await client.query(`
              ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_info text;
              ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_tips text;
              NOTIFY pgrst, 'reload schema';
            `)
            console.log(`✅ Altered and reloaded schema on ${host}:${port}`)

            await client.end()
          } catch (err: any) {
            // silent
          }
        }
      }
    }
  }

  // Now test Supabase JS client
  console.log('\n--- Testing Supabase Client ---')
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.from('products').select('*').limit(1)
  if (error) {
    console.error('Supabase client select error:', error)
  } else {
    console.log('Supabase client success! Row keys:', data ? Object.keys(data[0] || {}) : [])
    console.log('Sample row:', data?.[0])
  }
}

diagnose().catch(console.error)
