import { describe, it, expect } from 'vitest'
import {
  formatCurrencyAmount,
  convertBaseAmount,
  detectCurrencyFromCountry,
  getCurrencyInfo,
  DEFAULT_CURRENCIES,
  BASE_CURRENCY,
} from './currency'

describe('Multi-Currency Utility Functions', () => {
  it('should return valid metadata for supported currencies', () => {
    const usd = getCurrencyInfo('USD')
    expect(usd.code).toBe('USD')
    expect(usd.symbol).toBe('$')
    expect(usd.decimals).toBe(2)

    const lkr = getCurrencyInfo('LKR')
    expect(lkr.code).toBe('LKR')
    expect(lkr.symbol).toBe('Rs')
    expect(lkr.decimals).toBe(2)
  })

  it('should fall back to USD for empty or unknown currency codes', () => {
    const fallback = getCurrencyInfo(null)
    expect(fallback.code).toBe('USD')

    const unknown = getCurrencyInfo('XYZ')
    expect(unknown.code).toBe('XYZ')
    expect(unknown.symbol).toBe('XYZ')
  })

  it('should correctly map country codes to currency codes', () => {
    expect(detectCurrencyFromCountry('LK')).toBe('LKR')
    expect(detectCurrencyFromCountry('US')).toBe('USD')
    expect(detectCurrencyFromCountry('GB')).toBe('GBP')
    expect(detectCurrencyFromCountry('AU')).toBe('AUD')
    expect(detectCurrencyFromCountry('CA')).toBe('CAD')
    expect(detectCurrencyFromCountry('IN')).toBe('INR')
    expect(detectCurrencyFromCountry('DE')).toBe('EUR')
    expect(detectCurrencyFromCountry('FR')).toBe('EUR')
    expect(detectCurrencyFromCountry('XX')).toBe(BASE_CURRENCY)
    expect(detectCurrencyFromCountry(null)).toBe(BASE_CURRENCY)
  })

  it('should format amounts according to currency symbols and decimal rules', () => {
    const formattedUsd = formatCurrencyAmount(12.5, 'USD')
    expect(formattedUsd).toBe('$ 12.50')

    const formattedLkr = formatCurrencyAmount(4500.75, 'LKR')
    expect(formattedLkr).toBe('Rs 4,500.75')

    const customSymbol = formatCurrencyAmount(10, 'USD', 'US$')
    expect(customSymbol).toBe('US$ 10.00')
  })

  it('should correctly convert base amounts using exchange rates', () => {
    // 1 USD = 300 LKR
    const resultLkr = convertBaseAmount(10.0, 300.0, 'LKR')
    expect(resultLkr.amount).toBe(3000.0)
    expect(resultLkr.currency).toBe('LKR')
    expect(resultLkr.symbol).toBe('Rs')
    expect(resultLkr.formatted).toBe('Rs 3,000.00')

    // 1 USD = 0.78 GBP
    const resultGbp = convertBaseAmount(100.0, 0.78, 'GBP')
    expect(resultGbp.amount).toBe(78.0)
    expect(resultGbp.currency).toBe('GBP')
    expect(resultGbp.symbol).toBe('£')
    expect(resultGbp.formatted).toBe('£ 78.00')
  })
})
