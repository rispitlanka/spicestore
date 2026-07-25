import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BASE_CURRENCY, DEFAULT_CURRENCIES } from '@/lib/currency'

export const revalidate = 0

// Supported currencies to sync
const SUPPORTED_CURRENCY_CODES = Object.keys(DEFAULT_CURRENCIES)

export async function GET() {
  return handleExchangeRateUpdate()
}

export async function POST() {
  return handleExchangeRateUpdate()
}

async function handleExchangeRateUpdate() {
  try {
    console.log('🔄 Cron: Fetching latest exchange rates from external API...')

    // 1. Fetch live rates from free exchange rate API (open.er-api.com)
    const apiUrl = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'YarlSamayal-Storefront/1.0' },
    })

    if (!response.ok) {
      throw new Error(`External exchange rate API responded with status ${response.status}`)
    }

    const data = await response.json()
    if (data.result !== 'success' || !data.rates) {
      throw new Error(data['error-type'] || 'Invalid exchange rate API response structure')
    }

    const fetchedRates: Record<string, number> = data.rates
    const upsertRows: Array<{ currency_code: string; rate_to_base: number; updated_at: string }> = []
    const syncedRates: Record<string, number> = {}

    // Base currency is always 1.0
    upsertRows.push({
      currency_code: BASE_CURRENCY,
      rate_to_base: 1.0,
      updated_at: new Date().toISOString(),
    })
    syncedRates[BASE_CURRENCY] = 1.0

    for (const code of SUPPORTED_CURRENCY_CODES) {
      if (code === BASE_CURRENCY) continue
      if (typeof fetchedRates[code] === 'number') {
        const rate = fetchedRates[code]
        upsertRows.push({
          currency_code: code,
          rate_to_base: Number(rate.toFixed(6)),
          updated_at: new Date().toISOString(),
        })
        syncedRates[code] = rate
      } else if (DEFAULT_CURRENCIES[code]) {
        // Fallback to default if API misses a currency code
        const fallbackRate = code === 'LKR' ? 300.0 : 1.0
        upsertRows.push({
          currency_code: code,
          rate_to_base: fallbackRate,
          updated_at: new Date().toISOString(),
        })
        syncedRates[code] = fallbackRate
      }
    }

    // 2. Try upserting into database if exchange_rates table is available
    let dbSuccess = false
    try {
      const supabase = await createClient()
      const { error: upsertError } = await (supabase as any)
        .from('exchange_rates')
        .upsert(upsertRows, { onConflict: 'currency_code' })

      if (!upsertError) {
        dbSuccess = true
        console.log(`✅ Upserted ${upsertRows.length} exchange rates into database.`)
      } else {
        console.warn('Database upsert warning (table may be pending migration):', upsertError.message)
      }

      // Also record last sync timestamp in settings table
      await (supabase as any).from('settings').upsert(
        {
          key: 'last_exchange_rates_sync',
          value: {
            synced_at: new Date().toISOString(),
            synced_rates: syncedRates,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    } catch (err: any) {
      console.warn('Could not write exchange rates to database:', err.message)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced exchange rates for ${Object.keys(syncedRates).length} currencies.`,
      base_currency: BASE_CURRENCY,
      rates: syncedRates,
      db_synced: dbSuccess,
      updated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Error updating exchange rates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch and update exchange rates',
      },
      { status: 500 }
    )
  }
}
