'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  BASE_CURRENCY,
  DEFAULT_CURRENCIES,
  detectCurrencyFromCountry,
  convertBaseAmount,
  formatCurrencyAmount,
  getCurrencyInfo,
} from '@/lib/currency'
import { createClient } from '@/lib/supabase/client'

const COOKIE_NAME = 'preferred_currency'

export interface CurrencyContextType {
  currency: string
  rates: Record<string, number>
  baseCurrency: string
  loading: boolean
  setCurrency: (code: string) => void
  convertAmount: (
    baseAmount: number,
    targetCode?: string
  ) => { amount: number; formatted: string; symbol: string; currency: string }
  formatBasePrice: (baseAmount: number) => string
  refreshRates: () => Promise<void>
}

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  LKR: 300.0,
  GBP: 0.78,
  EUR: 0.92,
  AUD: 1.52,
  CAD: 1.38,
  INR: 83.5,
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: BASE_CURRENCY,
  rates: DEFAULT_RATES,
  baseCurrency: BASE_CURRENCY,
  loading: true,
  setCurrency: () => {},
  convertAmount: (baseAmount: number) => ({
    amount: baseAmount,
    formatted: `$ ${baseAmount.toFixed(2)}`,
    symbol: '$',
    currency: BASE_CURRENCY,
  }),
  formatBasePrice: (baseAmount: number) => `$ ${baseAmount.toFixed(2)}`,
  refreshRates: async () => {},
})

/**
 * Helper to get cookie value on client side
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return matches ? decodeURIComponent(matches[1]) : null
}

/**
 * Helper to set cookie on client side
 */
function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>(BASE_CURRENCY)
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES)
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch exchange rates from database or endpoint
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true)
      let fetchedFromDb = false

      try {
        const supabase = createClient() as any
        const { data, error } = await supabase.from('exchange_rates').select('currency_code, rate_to_base')

        if (!error && data && data.length > 0) {
          const ratesMap: Record<string, number> = { ...DEFAULT_RATES }
          data.forEach((row: { currency_code: string; rate_to_base: number }) => {
            if (row.currency_code && typeof row.rate_to_base === 'number') {
              ratesMap[row.currency_code.toUpperCase()] = Number(row.rate_to_base)
            }
          })
          setRates(ratesMap)
          fetchedFromDb = true
        }
      } catch {
        // Silent catch if DB table is unavailable
      }

      if (!fetchedFromDb) {
        try {
          const res = await fetch('/api/cron/update-exchange-rates')
          if (res.ok) {
            const cronData = await res.json()
            if (cronData?.rates) {
              setRates((prev) => ({ ...DEFAULT_RATES, ...prev, ...cronData.rates }))
            }
          }
        } catch {
          // Keep DEFAULT_RATES
        }
      }
    } catch (err) {
      console.warn('Error fetching exchange rates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize currency selection and fetch exchange rates
  useEffect(() => {
    fetchRates()

    // Read cookie preference
    const savedCurrency = getCookie(COOKIE_NAME)
    if (savedCurrency && DEFAULT_CURRENCIES[savedCurrency.toUpperCase()]) {
      setCurrencyState(savedCurrency.toUpperCase())
    } else {
      // Auto-detect based on country default if not stored
      const initial = BASE_CURRENCY
      setCurrencyState(initial)
      setCookie(COOKIE_NAME, initial)
    }
  }, [fetchRates])

  const handleSetCurrency = (newCode: string) => {
    const upper = newCode.toUpperCase()
    if (!DEFAULT_CURRENCIES[upper]) return
    setCurrencyState(upper)
    setCookie(COOKIE_NAME, upper)
  }

  const convertAmount = useCallback(
    (baseAmount: number, targetCode?: string) => {
      const activeCode = targetCode || currency
      const rate = rates[activeCode] || DEFAULT_RATES[activeCode] || 1.0
      return convertBaseAmount(baseAmount, rate, activeCode)
    },
    [currency, rates]
  )

  const formatBasePrice = useCallback(
    (baseAmount: number) => {
      const conv = convertAmount(baseAmount)
      return conv.formatted
    },
    [convertAmount]
  )

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        rates,
        baseCurrency: BASE_CURRENCY,
        loading,
        setCurrency: handleSetCurrency,
        convertAmount,
        formatBasePrice,
        refreshRates: fetchRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
