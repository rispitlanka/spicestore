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

async function reloadSchema() {
  const client = new Client({
    host: 'db.gwlcnuhznevhntvhizhc.supabase.co',
    port: 5432,
    user: 'postgres.gwlcnuhznevhntvhizhc',
    password: 'YarlSamayal2026!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to DB!')
    await client.query("NOTIFY pgrst, 'reload schema';")
    console.log("✅ Sent NOTIFY pgrst, 'reload schema'")
    await client.end()
  } catch (err: any) {
    console.error('Error reloading schema:', err.message)
  }
}

reloadSchema()
