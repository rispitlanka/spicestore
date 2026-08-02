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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSelect() {
  const res1 = await supabase.from('products').select('*').limit(1)
  console.log('Select * error:', res1.error)
  console.log('Select * data keys:', res1.data ? Object.keys(res1.data[0]) : null)

  const res2 = await supabase.from('products').select('id, shipping_info, storage_tips').limit(1)
  console.log('Select explicit error:', res2.error)
  console.log('Select explicit data:', res2.data)
}

testSelect().catch(console.error)
