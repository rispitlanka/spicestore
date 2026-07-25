import { createClient } from '@/lib/supabase/client'

export interface Coupon {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order_value: number
  usage_limit?: number | null
  usage_count: number
  per_customer_limit?: number | null
  applicable_product_ids?: string[] | null
  applicable_category_ids?: string[] | null
  valid_from?: string | null
  valid_until?: string | null
  is_active: boolean
}

export interface CartItem {
  id: string
  productId: string
  variationId?: string | null
  name: string
  slug: string
  price: number
  weightKg: number
  quantity: number
  categoryId?: string | null
}

export interface CouponValidationResult {
  valid: boolean
  reason?: string
  discountAmount?: number
  coupon?: Coupon
}

/**
 * Pure validation logic for coupons given pre-fetched data.
 * Useful for synchronous evaluation and unit testing.
 *
 * Partial Cart Coupon Rule:
 * - If a coupon has no product or category restrictions, the discount applies to the entire order subtotal.
 * - If a coupon is restricted by applicable_product_ids or applicable_category_ids, the discount applies
 *   exclusively to the subtotal of the matching cart items to prevent discounting non-eligible products.
 *
 * Guest Customer Limit Rule:
 * - Guest users do not have a customerId. Per-customer redemption limits are skipped for guest checkouts
 *   since guest user identities cannot be uniquely verified at validation time.
 */
export function validateCouponWithData(
  coupon: Coupon | null | undefined,
  cart: CartItem[],
  subtotal: number,
  customerId?: string,
  redemptionsCount: number = 0,
  productCategoryMap: Record<string, string> = {},
  currentDate: Date = new Date()
): CouponValidationResult {
  // 1. Coupon existence, is_active, valid_from/valid_until check
  if (!coupon) {
    return { valid: false, reason: 'Coupon code does not exist.' }
  }

  if (!coupon.is_active) {
    return { valid: false, reason: 'Coupon is inactive.' }
  }

  if (coupon.valid_from && new Date(coupon.valid_from) > currentDate) {
    return { valid: false, reason: 'Coupon is not valid yet.' }
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < currentDate) {
    return { valid: false, reason: 'Coupon has expired.' }
  }

  // 2. Usage limit check
  if (coupon.usage_limit != null && coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, reason: 'Coupon usage limit has been reached.' }
  }

  // 3. Minimum order value check
  const minOrderVal = Number(coupon.min_order_value ?? 0)
  if (subtotal < minOrderVal) {
    return {
      valid: false,
      reason: `Minimum order value of $${minOrderVal.toFixed(2)} required for this coupon.`,
    }
  }

  // 4. Applicable products / categories check
  const hasProductRestriction =
    Array.isArray(coupon.applicable_product_ids) && coupon.applicable_product_ids.length > 0
  const hasCategoryRestriction =
    Array.isArray(coupon.applicable_category_ids) && coupon.applicable_category_ids.length > 0
  const isRestricted = hasProductRestriction || hasCategoryRestriction

  let applicableSubtotal = subtotal

  if (isRestricted) {
    const matchingItems = cart.filter((item) => {
      const matchesProduct =
        hasProductRestriction && coupon.applicable_product_ids!.includes(item.productId)
      const itemCategoryId =
        item.categoryId || (item.productId ? productCategoryMap[item.productId] : null)
      const matchesCategory =
        hasCategoryRestriction &&
        Boolean(itemCategoryId) &&
        coupon.applicable_category_ids!.includes(itemCategoryId!)

      return matchesProduct || matchesCategory
    })

    if (matchingItems.length === 0) {
      return { valid: false, reason: 'Coupon is not applicable to any items in your cart.' }
    }

    applicableSubtotal = matchingItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
  }

  // 5. Per-customer limit check
  if (
    coupon.per_customer_limit != null &&
    coupon.per_customer_limit > 0 &&
    customerId
  ) {
    if (redemptionsCount >= coupon.per_customer_limit) {
      return { valid: false, reason: 'You have reached the redemption limit for this coupon.' }
    }
  }

  // Discount calculation
  applicableSubtotal = Math.max(0, applicableSubtotal)
  let rawDiscount = 0

  if (coupon.type === 'percent') {
    rawDiscount = (applicableSubtotal * Number(coupon.value)) / 100
  } else if (coupon.type === 'fixed') {
    rawDiscount = Number(coupon.value)
  }

  const discountAmount = Math.round(Math.min(rawDiscount, applicableSubtotal) * 100) / 100

  return {
    valid: true,
    discountAmount,
    coupon,
  }
}

/**
 * Validates a coupon by code against cart items and customer history using Supabase.
 * Checks sequentially in order:
 * 1. Coupon existence, is_active, valid_from/valid_until
 * 2. usage_count < usage_limit
 * 3. subtotal >= min_order_value
 * 4. Product / Category restrictions and matching cart items
 * 5. per_customer_limit check via coupon_redemptions
 */
export async function validateCoupon(
  code: string,
  cart: CartItem[],
  subtotal: number,
  customerId?: string
): Promise<CouponValidationResult> {
  if (!code || !code.trim()) {
    return { valid: false, reason: 'Coupon code is required.' }
  }

  const cleanCode = code.trim()

  try {
    const supabase = createClient() as any
    const { data: couponData, error } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', cleanCode)
      .maybeSingle()

    if (error || !couponData) {
      return { valid: false, reason: 'Coupon code does not exist.' }
    }

    const coupon: Coupon = {
      id: couponData.id,
      code: couponData.code,
      type: couponData.type as 'percent' | 'fixed',
      value: Number(couponData.value),
      min_order_value: Number(couponData.min_order_value ?? 0),
      usage_limit: couponData.usage_limit,
      usage_count: couponData.usage_count ?? 0,
      per_customer_limit: couponData.per_customer_limit,
      applicable_product_ids: couponData.applicable_product_ids,
      applicable_category_ids: couponData.applicable_category_ids,
      valid_from: couponData.valid_from,
      valid_until: couponData.valid_until,
      is_active: couponData.is_active,
    }

    // Check customer redemption count if customerId is present
    let redemptionsCount = 0
    if (coupon.per_customer_limit != null && coupon.per_customer_limit > 0 && customerId) {
      const { count, error: countErr } = await supabase
        .from('coupon_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('customer_id', customerId)

      if (!countErr && count != null) {
        redemptionsCount = count
      }
    }

    // Fetch category mapping for cart products if category restriction is active
    const productCategoryMap: Record<string, string> = {}
    const hasCategoryRestriction =
      Array.isArray(coupon.applicable_category_ids) && coupon.applicable_category_ids.length > 0

    if (hasCategoryRestriction && cart.length > 0) {
      const productIds = Array.from(new Set(cart.map((i) => i.productId).filter(Boolean)))
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, category_id')
          .in('id', productIds)

        if (products) {
          for (const p of products) {
            if (p.id && p.category_id) {
              productCategoryMap[p.id] = p.category_id
            }
          }
        }
      }
    }

    return validateCouponWithData(
      coupon,
      cart,
      subtotal,
      customerId,
      redemptionsCount,
      productCategoryMap
    )
  } catch (err) {
    console.error('Error validating coupon:', err)
    return { valid: false, reason: 'Failed to validate coupon code.' }
  }
}
