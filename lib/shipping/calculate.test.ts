import { describe, it, expect } from 'vitest'
import { calculateShippingFromTiers, getItemWeight } from './calculate'

describe('calculateShippingFromTiers', () => {
  // Brackets from requirement example: 1kg/$5, 3kg/$12, 5kg/$18, 11kg/$35
  const sampleTiers = [
    { weight_kg: 1, price: 5 },
    { weight_kg: 3, price: 12 },
    { weight_kg: 5, price: 18 },
    { weight_kg: 11, price: 35 },
  ]

  it('calculates optimal shipping for 4kg cart weight (3kg + 1kg = $17 instead of 5kg = $18)', () => {
    const result = calculateShippingFromTiers(sampleTiers, 4000)
    expect(result.cost).toBe(17)
    expect(result.coveredCapacityGrams).toBe(4000)
    expect(result.breakdown).toEqual([
      { weightKg: 1, price: 5, count: 1 },
      { weightKg: 3, price: 12, count: 1 },
    ])
  })

  it('calculates optimal shipping for 2kg cart weight (1kg + 1kg = $10 instead of 3kg = $12)', () => {
    const result = calculateShippingFromTiers(sampleTiers, 2000)
    expect(result.cost).toBe(10)
    expect(result.coveredCapacityGrams).toBe(2000)
    expect(result.breakdown).toEqual([
      { weightKg: 1, price: 5, count: 2 },
    ])
  })

  it('handles cart weight requiring bracket over-capacity (e.g. 2.5kg covered by 3kg bracket for $12)', () => {
    const result = calculateShippingFromTiers(sampleTiers, 2500)
    expect(result.cost).toBe(12)
    expect(result.coveredCapacityGrams).toBe(3000)
    expect(result.breakdown).toEqual([
      { weightKg: 3, price: 12, count: 1 },
    ])
  })

  it('returns zero cost and empty breakdown for zero or negative weight', () => {
    const result = calculateShippingFromTiers(sampleTiers, 0)
    expect(result.cost).toBe(0)
    expect(result.coveredCapacityGrams).toBe(0)
    expect(result.breakdown).toEqual([])
  })

  it('handles empty tiers list gracefully', () => {
    const result = calculateShippingFromTiers([], 4000)
    expect(result.cost).toBe(0)
    expect(result.coveredCapacityGrams).toBe(0)
    expect(result.breakdown).toEqual([])
  })
})

describe('getItemWeight', () => {
  it('uses variation.weight_kg when variation exists', () => {
    const product = { base_weight_kg: 0.5 }
    const variation = { weight_kg: 1.2 }
    expect(getItemWeight(product, variation)).toBe(1.2)
  })

  it('uses product.base_weight_kg when variation does not exist or has no weight_kg', () => {
    const product = { base_weight_kg: 0.75 }
    expect(getItemWeight(product, null)).toBe(0.75)
    expect(getItemWeight(product, undefined)).toBe(0.75)
  })

  it('returns 0 if neither base_weight_kg nor variation.weight_kg is available', () => {
    expect(getItemWeight({}, null)).toBe(0)
  })
})
