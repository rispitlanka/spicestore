export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  decimals: number
  flag: string
}

export const BASE_CURRENCY = 'USD'

export const DEFAULT_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, flag: '🇺🇸' },
  LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', decimals: 2, flag: '🇱🇰' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, flag: '🇬🇧' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, flag: '🇪🇺' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, flag: '🇦🇺' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, flag: '🇨🇦' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, flag: '🇮🇳' },
}

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  LK: 'LKR',
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  IN: 'INR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  PT: 'EUR',
  GR: 'EUR',
}

/**
 * Gets metadata for a currency code with standard fallback to USD
 */
export function getCurrencyInfo(code?: string | null): CurrencyInfo {
  if (!code) return DEFAULT_CURRENCIES[BASE_CURRENCY]
  const upper = code.toUpperCase()
  return (
    DEFAULT_CURRENCIES[upper] || {
      code: upper,
      name: upper,
      symbol: upper,
      decimals: 2,
      flag: '🌐',
    }
  )
}

/**
 * Maps a country code (e.g. from Vercel geolocation x-vercel-ip-country or shipping country selection)
 * to a supported currency code, defaulting to store base currency (USD).
 */
export function detectCurrencyFromCountry(countryCode?: string | null): string {
  if (!countryCode) return BASE_CURRENCY
  const upperCountry = countryCode.trim().toUpperCase()
  return COUNTRY_TO_CURRENCY[upperCountry] || BASE_CURRENCY
}

/**
 * Formats a numerical amount in a given currency code according to its decimal rules.
 * Handles currencies like JPY with 0 decimal places vs 2 decimal places for USD/LKR/EUR.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string = BASE_CURRENCY,
  symbolOverride?: string
): string {
  const num = Number(amount || 0)
  const info = getCurrencyInfo(currencyCode)
  const symbol = symbolOverride || info.symbol

  // Round according to currency decimal places
  const rounded = num.toFixed(info.decimals)

  // Use Intl.NumberFormat if available for thousand separators while enforcing exact decimals
  try {
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(num)
    return `${symbol} ${formattedNum}`
  } catch {
    return `${symbol} ${rounded}`
  }
}

/**
 * Converts an amount from base currency to a target currency using the given rate_to_base.
 * Rate formula: targetAmount = baseAmount * rate_to_base
 */
export function convertBaseAmount(
  baseAmount: number,
  rateToBase: number = 1.0,
  targetCurrency: string = BASE_CURRENCY
): {
  amount: number
  currency: string
  symbol: string
  formatted: string
} {
  const info = getCurrencyInfo(targetCurrency)
  const rawConverted = baseAmount * (rateToBase || 1.0)
  
  // Calculate precision rounding factor (e.g., 100 for 2 decimals, 1 for 0 decimals)
  const factor = Math.pow(10, info.decimals)
  const roundedAmount = Math.round(rawConverted * factor) / factor

  return {
    amount: roundedAmount,
    currency: info.code,
    symbol: info.symbol,
    formatted: formatCurrencyAmount(roundedAmount, info.code),
  }
}
