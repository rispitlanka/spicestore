import { describe, it, expect } from 'vitest'
import { validateCouponWithData, Coupon, CartItem } from './validate'

describe('validateCouponWithData', () => {
  const baseDate = new Date('2026-07-24T12:00:00Z')

  const validCoupon: Coupon = {
    id: 'coupon-1',
    code: 'SAVE10',
    type: 'percent',
    value: 10,
    min_order_value: 50,
    usage_limit: 100,
    usage_count: 5,
    per_customer_limit: 2,
    applicable_product_ids: null,
    applicable_category_ids: null,
    valid_from: '2026-01-01T00:00:00Z',
    valid_until: '2026-12-31T23:59:59Z',
    is_active: true,
  }

  const sampleCart: CartItem[] = [
    {
      id: 'p1-item',
      productId: 'prod-1',
      name: 'Spices Mix',
      slug: 'spices-mix',
      price: 30,
      weightKg: 0.5,
      quantity: 2, // subtotal = 60
    },
  ]

  it('validates a valid percentage coupon successfully', () => {
    const result = validateCouponWithData(validCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(6) // 10% of 60 = 6
    expect(result.coupon?.code).toBe('SAVE10')
  })

  it('returns invalid for non-existent coupon', () => {
    const result = validateCouponWithData(null, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Coupon code does not exist.')
  })

  it('returns invalid for inactive coupon', () => {
    const inactiveCoupon: Coupon = { ...validCoupon, is_active: false }
    const result = validateCouponWithData(inactiveCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Coupon is inactive.')
  })

  it('returns invalid for expired coupon scenario', () => {
    const expiredCoupon: Coupon = {
      ...validCoupon,
      valid_until: '2026-06-01T00:00:00Z',
    }
    const result = validateCouponWithData(expiredCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Coupon has expired.')
  })

  it('returns invalid for not yet valid coupon', () => {
    const futureCoupon: Coupon = {
      ...validCoupon,
      valid_from: '2026-08-01T00:00:00Z',
    }
    const result = validateCouponWithData(futureCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Coupon is not valid yet.')
  })

  it('returns invalid for global usage limit reached', () => {
    const maxedCoupon: Coupon = {
      ...validCoupon,
      usage_limit: 10,
      usage_count: 10,
    }
    const result = validateCouponWithData(maxedCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Coupon usage limit has been reached.')
  })

  it('returns invalid for min-order-not-met scenario', () => {
    const minOrderCoupon: Coupon = {
      ...validCoupon,
      min_order_value: 100,
    }
    const result = validateCouponWithData(minOrderCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Minimum order value of $100.00 required for this coupon.')
  })

  it('handles product-restricted scenario when no cart items match', () => {
    const productRestrictedCoupon: Coupon = {
      ...validCoupon,
      applicable_product_ids: ['prod-999'],
    }
    const result = validateCouponWithData(productRestrictedCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Coupon is not applicable to any items in your cart.')
  })

  it('applies discount only to matching items in product-restricted scenario', () => {
    const productRestrictedCoupon: Coupon = {
      ...validCoupon,
      applicable_product_ids: ['prod-1'], // matches prod-1 ($60 subtotal)
      min_order_value: 50,
    }
    const mixedCart: CartItem[] = [
      ...sampleCart, // prod-1: $30 x 2 = $60
      {
        id: 'p2-item',
        productId: 'prod-2',
        name: 'Curry Powder',
        slug: 'curry-powder',
        price: 40,
        weightKg: 0.2,
        quantity: 1, // prod-2: $40
      },
    ] // Total cart subtotal = $100

    const result = validateCouponWithData(productRestrictedCoupon, mixedCart, 100, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(true)
    // 10% discount on $60 (prod-1 subtotal), NOT on $100 whole order
    expect(result.discountAmount).toBe(6)
  })

  it('applies discount only to matching items in category-restricted scenario', () => {
    const categoryRestrictedCoupon: Coupon = {
      ...validCoupon,
      applicable_category_ids: ['cat-spices'],
      type: 'fixed',
      value: 15,
    }
    const cart: CartItem[] = [
      {
        id: 'item-1',
        productId: 'prod-1',
        name: 'Chilli Powder',
        slug: 'chilli-powder',
        price: 10,
        weightKg: 0.1,
        quantity: 2, // $20
        categoryId: 'cat-spices',
      },
      {
        id: 'item-2',
        productId: 'prod-2',
        name: 'Clay Pot',
        slug: 'clay-pot',
        price: 50,
        weightKg: 2.0,
        quantity: 1, // $50
        categoryId: 'cat-cookware',
      },
    ]

    const result = validateCouponWithData(categoryRestrictedCoupon, cart, 70, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(true)
    // Fixed discount of $15 on matching spices subtotal ($20)
    expect(result.discountAmount).toBe(15)
  })

  it('caps fixed discount at applicable subtotal', () => {
    const fixedCoupon: Coupon = {
      ...validCoupon,
      type: 'fixed',
      value: 100, // $100 fixed discount on $60 order
      min_order_value: 10,
    }
    const result = validateCouponWithData(fixedCoupon, sampleCart, 60, 'user-1', 0, {}, baseDate)
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(60) // Capped at $60 subtotal
  })

  it('returns invalid when per-customer redemption limit is reached', () => {
    const customerLimitCoupon: Coupon = {
      ...validCoupon,
      per_customer_limit: 1,
    }
    const result = validateCouponWithData(customerLimitCoupon, sampleCart, 60, 'user-1', 1, {}, baseDate)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('You have reached the redemption limit for this coupon.')
  })
})
