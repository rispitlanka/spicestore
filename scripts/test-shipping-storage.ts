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

async function testShippingAndStorageColumns() {
  console.log('Testing shipping_info and storage_tips column select...')
  const { data: prods, error: selectErr } = await supabase
    .from('products')
    .select('id, name, slug, description, ingredients, shipping_info, storage_tips')
    .limit(3)

  if (selectErr) {
    console.error('Error fetching products shipping_info & storage_tips:', selectErr.message)
    process.exit(1)
  }

  console.log('Query success! Read sample products:', prods?.length)

  // Test updating shipping_info and storage_tips on first product
  if (prods && prods.length > 0) {
    const targetProd = prods[0]
    const testShipping = 'Express delivery in sealed food-grade pouches.'
    const testStorage = 'Keep in a cool, dry pantry away from moisture.'

    console.log(`Testing update on product ${targetProd.id} (${targetProd.name})...`)
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        shipping_info: testShipping,
        storage_tips: testStorage,
      })
      .eq('id', targetProd.id)

    if (updateErr) {
      console.error('Update error:', updateErr.message)
      process.exit(1)
    }

    const { data: updatedProd, error: reSelectErr } = await supabase
      .from('products')
      .select('id, name, shipping_info, storage_tips')
      .eq('id', targetProd.id)
      .single()

    if (reSelectErr || !updatedProd) {
      console.error('Re-select error:', reSelectErr?.message)
      process.exit(1)
    }

    console.log('Successfully updated & re-selected product:', updatedProd)
    if (updatedProd.shipping_info === testShipping && updatedProd.storage_tips === testStorage) {
      console.log('✅ Value verification confirmed!')
    } else {
      console.error('❌ Mismatch in saved values!')
      process.exit(1)
    }
  }

  console.log('✅ All verification checks passed cleanly!')
}

testShippingAndStorageColumns().catch((err) => {
  console.error(err)
  process.exit(1)
})
