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

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260725000009_footer_settings.sql')
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

  // Fallback: upsert via Supabase JS client if PG direct connection fails
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const defaultRows: Array<{ key: string; value: Record<string, any> }> = [
    { key: 'footer_about', value: { logo_url: '', tagline: 'Authentic Jaffna Spices & Regional Specialties', description: 'Handcrafted traditional spice blends, curry powders, and authentic Jaffna delicacies delivered worldwide directly from Sri Lanka.' } },
    { key: 'footer_contact', value: { email: 'info@yarlsamayal.com', phone: '+94 77 123 4567', whatsapp: '+94 77 123 4567', address: 'Main Street, Jaffna, Sri Lanka' } },
    { key: 'footer_social', value: { facebook: '', instagram: '', tiktok: '', youtube: '' } },
    { key: 'footer_copyright', value: { text: '© {year} Yarl Samayal. All rights reserved.' } },
  ]

  for (const r of defaultRows) {
    const { error } = await supabase.from('settings').upsert(r as any, { onConflict: 'key' })
    if (error) {
      console.warn(`Failed to seed ${r.key}:`, error.message)
    } else {
      console.log(`Seeded setting ${r.key} via Supabase client`)
    }
  }
}

applyMigration().catch((err) => {
  console.error('Migration script failed:', err)
})
