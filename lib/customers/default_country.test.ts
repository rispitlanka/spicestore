import { describe, it, expect } from 'vitest'
import { resolveDefaultCountryPrefill } from './default_country'

describe('resolveDefaultCountryPrefill', () => {
  it('Priority 1: returns active session country if present', () => {
    const result = resolveDefaultCountryPrefill({
      activeSessionCountryId: 'country-active-123',
      userProfileDefaultCountryId: 'country-profile-456',
      guestLocalStorageCountryId: 'country-guest-789',
      isLoggedIn: true,
    })

    expect(result.countryId).toBe('country-active-123')
    expect(result.shouldUpdateProfileWithGuestDefault).toBe(false)
  })

  it('Priority 2: returns logged-in customer profile default when active session is empty', () => {
    const result = resolveDefaultCountryPrefill({
      activeSessionCountryId: '',
      userProfileDefaultCountryId: 'country-profile-456',
      guestLocalStorageCountryId: 'country-guest-789',
      isLoggedIn: true,
    })

    expect(result.countryId).toBe('country-profile-456')
    expect(result.shouldUpdateProfileWithGuestDefault).toBe(false)
  })

  it('Priority 2 Edge Case: logged-in customer with null profile default uses guest localStorage and sets flag', () => {
    const result = resolveDefaultCountryPrefill({
      activeSessionCountryId: '',
      userProfileDefaultCountryId: null,
      guestLocalStorageCountryId: 'country-guest-789',
      isLoggedIn: true,
    })

    expect(result.countryId).toBe('country-guest-789')
    expect(result.shouldUpdateProfileWithGuestDefault).toBe(true)
  })

  it('Priority 3: guest customer uses guest localStorage default when active session is empty', () => {
    const result = resolveDefaultCountryPrefill({
      activeSessionCountryId: null,
      userProfileDefaultCountryId: null,
      guestLocalStorageCountryId: 'country-guest-789',
      isLoggedIn: false,
    })

    expect(result.countryId).toBe('country-guest-789')
    expect(result.shouldUpdateProfileWithGuestDefault).toBe(false)
  })

  it('Priority 4: returns empty string when no history exists for first-time guest', () => {
    const result = resolveDefaultCountryPrefill({
      activeSessionCountryId: null,
      userProfileDefaultCountryId: null,
      guestLocalStorageCountryId: null,
      isLoggedIn: false,
    })

    expect(result.countryId).toBe('')
    expect(result.shouldUpdateProfileWithGuestDefault).toBe(false)
  })
})
