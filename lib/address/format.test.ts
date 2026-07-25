import { describe, it, expect } from 'vitest'
import { formatAddress } from '../utils'

describe('formatAddress utility', () => {
  it('formats a complete Sri Lankan address matching example pattern', () => {
    const formatted = formatAddress({
      address_line1: '12 Hospital Road',
      address_line2: 'Nallur',
      city: 'Jaffna',
      district: 'Jaffna',
      country_name: 'Sri Lanka',
      country_code: 'LK',
    })

    expect(formatted).toBe('12 Hospital Road, Nallur\nJaffna, Jaffna District\nSri Lanka')
  })

  it('formats an address without optional line 2 or postal code', () => {
    const formatted = formatAddress({
      address_line1: '45 Main Street',
      city: 'Colombo',
      district: 'Colombo',
      country_name: 'Sri Lanka',
      country_code: 'LK',
    })

    expect(formatted).toBe('45 Main Street\nColombo, Colombo District\nSri Lanka')
  })

  it('formats an international address with State / Region and postal code', () => {
    const formatted = formatAddress({
      address_line1: '742 Evergreen Terrace',
      address_line2: 'Suite 100',
      city: 'Springfield',
      district: 'Oregon',
      postal_code: '97477',
      country_name: 'United States',
      country_code: 'US',
    })

    expect(formatted).toBe('742 Evergreen Terrace, Suite 100\nSpringfield, Oregon 97477\nUnited States')
  })

  it('handles null and empty input gracefully', () => {
    expect(formatAddress(null)).toBe('')
    expect(formatAddress({})).toBe('')
  })
})
