import { describe, it, expect } from 'vitest'
import { getProductCardImages } from './seo'

describe('getProductCardImages', () => {
  it('returns main image and second image in sort_order for simple product', () => {
    const mockProduct = {
      has_variations: false,
      product_images: [
        { id: 'img-1', url: 'https://example.com/main.jpg', sort_order: 10, is_main: true },
        { id: 'img-2', url: 'https://example.com/second.jpg', sort_order: 20, is_main: false },
        { id: 'img-3', url: 'https://example.com/third.jpg', sort_order: 30, is_main: false },
      ],
    }

    const { mainImage, hoverImage } = getProductCardImages(mockProduct)
    expect(mainImage?.id).toBe('img-1')
    expect(hoverImage?.id).toBe('img-2')
  })

  it('returns hoverImage as null if there is no second image available for scope', () => {
    const mockProduct = {
      has_variations: false,
      product_images: [
        { id: 'img-1', url: 'https://example.com/main.jpg', sort_order: 10, is_main: true },
      ],
    }

    const { mainImage, hoverImage } = getProductCardImages(mockProduct)
    expect(mainImage?.id).toBe('img-1')
    expect(hoverImage).toBeNull()
  })

  it('handles unordered sort_order correctly', () => {
    const mockProduct = {
      has_variations: false,
      product_images: [
        { id: 'img-3', url: 'https://example.com/3.jpg', sort_order: 30, is_main: false },
        { id: 'img-1', url: 'https://example.com/1.jpg', sort_order: 10, is_main: true },
        { id: 'img-2', url: 'https://example.com/2.jpg', sort_order: 20, is_main: false },
      ],
    }

    const { mainImage, hoverImage } = getProductCardImages(mockProduct)
    expect(mainImage?.id).toBe('img-1')
    expect(hoverImage?.id).toBe('img-2')
  })

  it('scopes images per variation group when has_variations is true', () => {
    const mockProduct = {
      has_variations: true,
      product_variations: [
        { id: 'var-100', is_active: true },
        { id: 'var-200', is_active: true },
      ],
      product_images: [
        { id: 'img-v1-1', url: 'https://example.com/v1-1.jpg', sort_order: 1, is_main: true, variation_id: 'var-100' },
        { id: 'img-v1-2', url: 'https://example.com/v1-2.jpg', sort_order: 2, is_main: false, variation_id: 'var-100' },
        { id: 'img-v2-1', url: 'https://example.com/v2-1.jpg', sort_order: 1, is_main: true, variation_id: 'var-200' },
      ],
    }

    const { mainImage, hoverImage } = getProductCardImages(mockProduct)
    expect(mainImage?.id).toBe('img-v1-1')
    expect(hoverImage?.id).toBe('img-v1-2')
  })

  it('returns nulls for empty product_images', () => {
    const { mainImage, hoverImage } = getProductCardImages({ product_images: [] })
    expect(mainImage).toBeNull()
    expect(hoverImage).toBeNull()
  })
})
