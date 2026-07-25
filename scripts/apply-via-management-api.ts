import fs from 'node:fs'
import path from 'node:path'

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

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260725000008_legal_pages.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

async function runManagementQuery() {
  const url = `https://api.supabase.com/v1/projects/gwlcnuhznevhntvhizhc/db/query`
  console.log('Posting query to Supabase management API...')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  console.log('Status:', res.status)
  const text = await res.text()
  console.log('Response:', text)
}

runManagementQuery().catch(console.error)
