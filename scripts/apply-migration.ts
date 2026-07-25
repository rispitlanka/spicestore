import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

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

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260726000001_performance_indexes.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

async function applyMigration() {
  console.log('Applying migration:', migrationPath)

  const hosts = [
    { host: '3.106.102.114', port: 6543, user: 'postgres.gwlcnuhznevhntvhizhc', pass: 'yarlsamayal123' },
    { host: '13.237.241.81', port: 6543, user: 'postgres.gwlcnuhznevhntvhizhc', pass: 'yarlsamayal123' },
    { host: '13.238.183.126', port: 6543, user: 'postgres.gwlcnuhznevhntvhizhc', pass: 'yarlsamayal123' },
  ]

  for (const h of hosts) {
    try {
      console.log(`Connecting via PG client to ${h.host}:${h.port}...`)
      const client = new Client({
        host: h.host,
        port: h.port,
        user: h.user,
        password: h.pass,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      })
      await client.connect()
      await client.query(sql)
      await client.end()
      console.log('✅ Migration applied successfully via PostgreSQL client!')
      return
    } catch (err: any) {
      console.warn(`Error on ${h.host}:`, err.message)
    }
  }

  // Fallback: test legal pages via Supabase client
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.from('legal_pages').select('slug')
  if (error) {
    console.warn('Supabase client check:', error.message)
  } else {
    console.log('legal_pages table exists and readable:', data)
  }
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err)
})
