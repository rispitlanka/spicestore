import { createClient } from '@/lib/supabase/client'

export interface ShippingTierInput {
  weight_kg: number
  price: number
}

export interface ShippingBreakdownItem {
  weightKg: number
  price: number
  count: number
}

export interface CalculateShippingResult {
  cost: number
  breakdown: ShippingBreakdownItem[]
  coveredCapacityGrams: number
}

/**
 * Computes item weight in kg from variation weight if variation exists, else product base weight.
 */
export function getItemWeight(
  product: { base_weight_kg?: number | null },
  variation?: { weight_kg?: number | null } | null
): number {
  if (variation && typeof variation.weight_kg === 'number') {
    return variation.weight_kg
  }
  return product?.base_weight_kg ?? 0
}

/**
 * Solves the unbounded coin change / knapsack problem for shipping weight tiers.
 * Finds the combination of weight brackets that minimizes total price while covering at least totalWeightGrams.
 */
export function calculateShippingFromTiers(
  tiers: ShippingTierInput[],
  totalWeightGrams: number
): CalculateShippingResult {
  if (!tiers || tiers.length === 0 || totalWeightGrams <= 0) {
    return {
      cost: 0,
      breakdown: [],
      coveredCapacityGrams: 0,
    }
  }

  // Filter valid tiers (positive weight bracket and non-negative price)
  const validTiers = tiers.filter(
    (t) => typeof t.weight_kg === 'number' && t.weight_kg > 0 && typeof t.price === 'number' && t.price >= 0
  )

  if (validTiers.length === 0) {
    return {
      cost: 0,
      breakdown: [],
      coveredCapacityGrams: 0,
    }
  }

  // Convert weight_kg to weight in grams for DP increments
  const formattedTiers = validTiers.map((t) => ({
    weightKg: t.weight_kg,
    weightGrams: Math.round(t.weight_kg * 1000),
    price: t.price,
  }))

  const targetGrams = Math.ceil(totalWeightGrams)
  const maxBracketGrams = Math.max(...formattedTiers.map((t) => t.weightGrams))

  // DP range upper bound: targetGrams + maxBracketGrams (capped reasonably if needed for extreme values)
  const maxDPWeight = Math.min(
    targetGrams + maxBracketGrams,
    Math.max(50000, targetGrams + maxBracketGrams)
  )

  const dp = new Array<number>(maxDPWeight + 1).fill(Infinity)
  const parentTier = new Array<number>(maxDPWeight + 1).fill(-1)
  const parentPrevWeight = new Array<number>(maxDPWeight + 1).fill(-1)

  dp[0] = 0

  for (let i = 0; i < formattedTiers.length; i++) {
    const { weightGrams, price } = formattedTiers[i]
    for (let w = weightGrams; w <= maxDPWeight; w++) {
      if (dp[w - weightGrams] !== Infinity) {
        const candidateCost = dp[w - weightGrams] + price
        if (candidateCost < dp[w]) {
          dp[w] = candidateCost
          parentTier[w] = i
          parentPrevWeight[w] = w - weightGrams
        }
      }
    }
  }

  // Find the capacity >= targetGrams with the minimum total cost
  let bestW = -1
  let minCost = Infinity

  for (let w = targetGrams; w <= maxDPWeight; w++) {
    if (dp[w] < minCost) {
      minCost = dp[w]
      bestW = w
    }
  }

  if (bestW === -1 || minCost === Infinity) {
    return {
      cost: 0,
      breakdown: [],
      coveredCapacityGrams: 0,
    }
  }

  // Reconstruct tier counts by backtracking from bestW
  const counts = new Map<number, number>()
  let curr = bestW
  while (curr > 0) {
    const tierIdx = parentTier[curr]
    if (tierIdx === -1) break
    counts.set(tierIdx, (counts.get(tierIdx) || 0) + 1)
    curr = parentPrevWeight[curr]
  }

  const breakdown: ShippingBreakdownItem[] = []
  for (let i = 0; i < formattedTiers.length; i++) {
    const count = counts.get(i) || 0
    if (count > 0) {
      breakdown.push({
        weightKg: formattedTiers[i].weightKg,
        price: formattedTiers[i].price,
        count,
      })
    }
  }

  return {
    cost: Number(minCost.toFixed(2)),
    breakdown,
    coveredCapacityGrams: bestW,
  }
}

/**
 * Calculates shipping cost for a given country and total cart weight in grams.
 * Fetches shipping_tiers from Supabase for countryId and delegates to calculateShippingFromTiers.
 */
export async function calculateShipping(
  countryId: string,
  totalWeightGrams: number
): Promise<CalculateShippingResult> {
  if (!countryId || totalWeightGrams <= 0) {
    return {
      cost: 0,
      breakdown: [],
      coveredCapacityGrams: 0,
    }
  }

  const supabase = createClient()
  const { data: tiers, error } = await supabase
    .from('shipping_tiers')
    .select('weight_kg, price')
    .eq('country_id', countryId)
    .order('weight_kg', { ascending: true })

  if (error || !tiers) {
    console.error('Error fetching shipping tiers for country:', countryId, error)
    return {
      cost: 0,
      breakdown: [],
      coveredCapacityGrams: 0,
    }
  }

  return calculateShippingFromTiers(tiers, totalWeightGrams)
}
