import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

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

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260726000000_order_email_log.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

async function applyMigration() {
  console.log('Connecting to Supabase PG...')
  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.gwlcnuhznevhntvhizhc',
    password: 'yarlsamayal123',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  })

  await client.connect()
  console.log('Connected! Creating order_email_log table...')
  await client.query(sql)
  console.log('Reloading PostgREST schema cache...')
  await client.query("NOTIFY pgrst, 'reload schema';")
  await client.end()
  console.log('✅ Migration applied & schema reloaded successfully!')
}

applyMigration().catch(console.error)
