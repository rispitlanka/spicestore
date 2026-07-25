import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a raw UUID or string Order ID into a clean, human-readable reference code (e.g., "YS-00001" or "#07B84B29").
 */
export function formatOrderId(id: string | null | undefined, orderNumber?: string | null): string {
  if (orderNumber && orderNumber.trim()) return orderNumber.trim()
  if (!id) return ''
  if (id.includes('-') && !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i)) {
    return id.trim()
  }
  const shortCode = cleanCode(id)
  return `#${shortCode}`
}

export function getShortOrderId(id: string | null | undefined, orderNumber?: string | null): string {
  if (orderNumber && orderNumber.trim()) return orderNumber.trim()
  if (!id) return ''
  return cleanCode(id)
}

function cleanCode(id: string): string {
  const parts = id.split('-')
  const mainPart = parts[0] || id
  return mainPart.substring(0, 8).toUpperCase()
}

/**
 * Utility to fetch order details from Supabase whether given an order_number (e.g., YS-00001), full 36-char UUID, or 8-char short ID code.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchOrderByIdOrShortCode(
  supabase: any,
  orderIdOrShortCode: string,
  selectFields = '*, country:countries(name, code), coupon:coupons(code, type, value)'
) {
  if (!orderIdOrShortCode) {
    return { data: null, error: new Error('Order ID is required.') }
  }

  const clean = orderIdOrShortCode.trim().toLowerCase()

  // 1. Try order_number exact or ilike match (e.g., ys-00001)
  const { data: numData } = await supabase
    .from('orders')
    .select(selectFields)
    .ilike('order_number', clean)
    .maybeSingle()

  if (numData) {
    return { data: numData, error: null }
  }

  // 2. Full UUID match (36 chars)
  if (clean.length === 36 && clean.includes('-')) {
    const { data, error } = await supabase
      .from('orders')
      .select(selectFields)
      .eq('id', clean)
      .maybeSingle()
    return { data, error }
  }

  // 3. Short ID prefix match (8+ hex chars)
  const hexOnly = clean.replace(/[^0-9a-f]/g, '')
  if (hexOnly.length >= 8) {
    const prefix = hexOnly.substring(0, 8)
    const minUuid = `${prefix}-0000-0000-0000-000000000000`
    const maxUuid = `${prefix}-ffff-ffff-ffff-ffffffffffff`

    const { data } = await supabase
      .from('orders')
      .select(selectFields)
      .gte('id', minUuid)
      .lte('id', maxUuid)
      .limit(1)
      .maybeSingle()

    if (data) {
      return { data, error: null }
    }
  }

  // 4. Fallback direct eq on id if valid UUID syntax
  const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
  if (isUuidFormat) {
    const { data, error } = await supabase
      .from('orders')
      .select(selectFields)
      .eq('id', clean)
      .maybeSingle()
    return { data, error }
  }

  return { data: null, error: null }
}

export interface FormattableAddress {
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  district?: string | null
  postal_code?: string | null
  country_name?: string | null
  country_code?: string | null
  country?: { name?: string | null; code?: string | null } | null
}

/**
 * Reconstruct a clean, formatted multiline delivery address from structured fields.
 * Example:
 * "12 Hospital Road, Nallur\nJaffna, Jaffna District\nSri Lanka"
 */
export function formatAddress(addr?: FormattableAddress | null): string {
  if (!addr) return ''

  const line1Parts = [addr.address_line1?.trim(), addr.address_line2?.trim()].filter(Boolean)
  const line1 = line1Parts.join(', ')

  let districtText = addr.district?.trim() || ''
  const isSriLanka =
    addr.country_code?.toUpperCase() === 'LK' ||
    addr.country?.code?.toUpperCase() === 'LK' ||
    addr.country_name?.toLowerCase() === 'sri lanka' ||
    addr.country?.name?.toLowerCase() === 'sri lanka'

  if (districtText && isSriLanka && !districtText.toLowerCase().endsWith('district')) {
    districtText = `${districtText} District`
  }

  const cityAndDistrict = [addr.city?.trim(), districtText].filter(Boolean).join(', ')
  const postalCode = addr.postal_code?.trim() || ''
  const line2 = [cityAndDistrict, postalCode].filter(Boolean).join(' ')

  const countryName = addr.country_name?.trim() || addr.country?.name?.trim() || ''

  return [line1, line2, countryName].filter((line) => line.length > 0).join('\n')
}

