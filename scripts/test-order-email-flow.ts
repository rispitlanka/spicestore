import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmailFlow() {
  console.log('--- Starting Brevo Order Email Flow Test ---')

  // 1. Fetch existing order or create a dummy order
  let { data: order } = await supabase.from('orders').select('id, status, guest_email').limit(1).maybeSingle()

  if (!order) {
    console.log('No existing order found. Creating test order...')
    const { data: newOrder, error: createErr } = await supabase
      .from('orders')
      .insert({
        guest_name: 'Test Customer',
        guest_email: 'testcustomer@example.com',
        guest_phone: '+94 77 000 0000',
        address_line1: '123 Temple Road',
        city: 'Jaffna',
        district: 'Jaffna',
        postal_code: '40000',
        subtotal: 25.00,
        subtotal_base: 25.00,
        discount_amount: 5.00,
        total_weight_kg: 0.5,
        shipping_cost: 10.00,
        shipping_cost_base: 10.00,
        total_amount: 30.00,
        total_amount_base: 30.00,
        display_currency_code: 'LKR',
        exchange_rate_used: 300.0,
        total_amount_display: 9000.00,
        payment_method: 'Cash on Delivery',
        status: 'pending',
      })
      .select('id, status, guest_email')
      .single()

    if (createErr || !newOrder) {
      throw new Error(`Failed to create test order: ${createErr?.message}`)
    }
    order = newOrder
  }

  console.log('Target Order ID for testing:', order.id)

  // 2. Import sendOrderEmail and test all status events
  const { sendOrderEmail } = await import('../lib/email/sendOrderEmail')

  const events: Array<'orderPlaced' | 'orderConfirmed' | 'orderShipped' | 'orderDelivered' | 'orderCancelled'> = [
    'orderPlaced',
    'orderConfirmed',
    'orderShipped',
    'orderDelivered',
    'orderCancelled',
  ]

  for (const ev of events) {
    console.log(`Testing sendOrderEmail for event: "${ev}"...`)
    const res = await sendOrderEmail(order.id, ev)
    console.log(`  Result for ${ev}:`, res)
  }

  // 3. Query order_email_log table
  console.log('\nFetching order_email_log entries from Supabase...')
  const { data: logs, error: logsErr } = await supabase
    .from('order_email_log')
    .select('*')
    .eq('order_id', order.id)
    .order('sent_at', { ascending: false })

  if (logsErr) {
    console.error('❌ Failed to fetch order_email_log:', logsErr.message)
  } else {
    console.log(`✅ Found ${logs?.length || 0} log entries in order_email_log table:`)
    logs?.forEach((l) => {
      console.log(`  - ID: ${l.id} | Event: ${l.event_type} | Status: ${l.status} | SentAt: ${l.sent_at} | Error: ${l.error_message || 'None'}`)
    })
  }

  console.log('\n--- Email Integration Test Complete ---')
}

testEmailFlow().catch((err) => {
  console.error('Test execution failed:', err)
})
