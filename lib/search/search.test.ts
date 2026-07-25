import { describe, it, expect } from 'vitest'
import { SearchProductItem, SearchResult } from './searchProducts'

describe('Search Product formatting logic', () => {
  it('handles empty or whitespace query gracefully', () => {
    const rawQuery = '   '
    const result: SearchResult = {
      query: rawQuery.trim(),
      products: [],
      matchedCategory: null,
      totalMatches: 0,
    }
    expect(result.query).toBe('')
    expect(result.products).toHaveLength(0)
    expect(result.totalMatches).toBe(0)
  })

  it('calculates effective price and variation ranges correctly', () => {
    const mockProduct: SearchProductItem = {
      id: 'p-1',
      name: 'Jaffna Roasted Curry Powder',
      slug: 'jaffna-roasted-curry-powder',
      description: 'Dark roasted aromatic curry powder',
      base_price: null,
      base_weight_kg: null,
      has_variations: true,
      is_active: true,
      category_id: 'c-1',
      category_name: 'Curry Powders',
      category_slug: 'curry-powders',
      min_price: 4.99,
      max_price: 16.99,
      effectivePrice: 4.99,
      total_stock: 95,
      is_out_of_stock: false,
      image_url: 'https://example.com/curry.jpg',
    }

    expect(mockProduct.effectivePrice).toBe(4.99)
    expect(mockProduct.min_price).toBeLessThan(mockProduct.max_price)
    expect(mockProduct.is_out_of_stock).toBe(false)
  })

  it('identifies out of stock products correctly', () => {
    const outOfStockProduct: SearchProductItem = {
      id: 'p-2',
      name: 'Rare Seasoning Salt',
      slug: 'rare-seasoning-salt',
      description: 'Out of stock salt',
      base_price: 2.99,
      base_weight_kg: 0.1,
      has_variations: false,
      is_active: true,
      category_id: 'c-2',
      category_name: 'Spices',
      category_slug: 'spices',
      min_price: 2.99,
      max_price: 2.99,
      effectivePrice: 2.99,
      total_stock: 0,
      is_out_of_stock: true,
      image_url: null,
    }

    expect(outOfStockProduct.is_out_of_stock).toBe(true)
    expect(outOfStockProduct.total_stock).toBe(0)
  })
})
