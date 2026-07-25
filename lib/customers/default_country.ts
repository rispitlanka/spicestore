export interface DefaultCountryPrefillParams {
  activeSessionCountryId: string | null | undefined
  userProfileDefaultCountryId: string | null | undefined
  guestLocalStorageCountryId: string | null | undefined
  isLoggedIn: boolean
}

export interface DefaultCountryPrefillResult {
  countryId: string
  shouldUpdateProfileWithGuestDefault: boolean
}

export function resolveDefaultCountryPrefill(
  params: DefaultCountryPrefillParams
): DefaultCountryPrefillResult {
  const {
    activeSessionCountryId,
    userProfileDefaultCountryId,
    guestLocalStorageCountryId,
    isLoggedIn,
  } = params

  // Priority 1: Active cart session selection
  if (activeSessionCountryId && activeSessionCountryId.trim()) {
    return {
      countryId: activeSessionCountryId.trim(),
      shouldUpdateProfileWithGuestDefault: false,
    }
  }

  // Priority 2: Logged-in customer
  if (isLoggedIn) {
    if (userProfileDefaultCountryId && userProfileDefaultCountryId.trim()) {
      return {
        countryId: userProfileDefaultCountryId.trim(),
        shouldUpdateProfileWithGuestDefault: false,
      }
    }
    // Edge Case: Logged-in customer has no profile default yet, but guest localStorage default exists
    if (guestLocalStorageCountryId && guestLocalStorageCountryId.trim()) {
      return {
        countryId: guestLocalStorageCountryId.trim(),
        shouldUpdateProfileWithGuestDefault: true,
      }
    }
    return {
      countryId: '',
      shouldUpdateProfileWithGuestDefault: false,
    }
  }

  // Priority 3: Guest customer
  if (guestLocalStorageCountryId && guestLocalStorageCountryId.trim()) {
    return {
      countryId: guestLocalStorageCountryId.trim(),
      shouldUpdateProfileWithGuestDefault: false,
    }
  }

  // Priority 4: Leave unselected
  return {
    countryId: '',
    shouldUpdateProfileWithGuestDefault: false,
  }
}
