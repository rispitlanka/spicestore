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

async function testTables() {
  console.log('Testing exchange_rates table...')
  const { data, error } = await supabase.from('exchange_rates').select('*')
  console.log('exchange_rates result:', { data, error: error?.message })

  console.log('Testing orders columns...')
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, subtotal_base, display_currency_code, exchange_rate_used, total_amount_display')
    .limit(1)
  console.log('orders result:', { orderData, error: orderError?.message })
}

testTables().catch(console.error)
