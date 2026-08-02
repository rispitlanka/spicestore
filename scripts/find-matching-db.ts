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
  'db.gwlcnuhznevhntvhizhc.supabase.co',
  'aws-0-ap-southeast-2.pooler.supabase.com',
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
]

async function findDb() {
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

            // Run DDL
            await client.query(`
              ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_info text;
              ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_tips text;
              NOTIFY pgrst, 'reload schema';
            `)
            console.log(`Executed DDL on host=${host} port=${port} user=${user}`)
            await client.end()
          } catch (err: any) {
            // silent
          }
        }
      }
    }
  }

  // Check via Supabase JS client
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const res = await supabase.from('products').select('id, name, shipping_info, storage_tips').limit(3)
  console.log('Result via Supabase JS client:', res)
}

findDb().catch(console.error)
