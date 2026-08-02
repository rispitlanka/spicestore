/**
 * SEO Utility functions for stripping markdown, truncating text, resolving base URLs,
 * and resolving main product image for OpenGraph cards.
 */

/**
 * Strips markdown and HTML formatting from raw string input.
 */
export function stripMarkdown(markdownText: string | null | undefined): string {
  if (!markdownText) return ''

  let str = markdownText

  // Remove code blocks
  str = str.replace(/```[\s\S]*?```/g, '')

  // Remove inline code
  str = str.replace(/`([^`]+)`/g, '$1')

  // Remove images
  str = str.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

  // Remove links keeping link text
  str = str.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove headings (e.g. #, ##, ###)
  str = str.replace(/#{1,6}\s+/g, '')

  // Remove bold and italic (**, *, __, _)
  str = str.replace(/(\*\*|__)(.*?)\1/g, '$2')
  str = str.replace(/(\*|_)(.*?)\1/g, '$2')

  // Remove blockquotes
  str = str.replace(/^\s*>\s+/gm, '')

  // Remove list item markers (- *, + *, 1. *)
  str = str.replace(/^\s*[-*+]\s+/gm, '')
  str = str.replace(/^\s*\d+\.\s+/gm, '')

  // Remove HTML tags
  str = str.replace(/<[^>]*>/g, '')

  // Replace multi-whitespace/newlines with a single space
  str = str.replace(/\s+/g, ' ')

  return str.trim()
}

/**
 * Truncates text to a specified maximum length, snapping to word boundaries.
 */
export function truncateText(text: string | null | undefined, maxLength: number = 155): string {
  if (!text) return ''
  const cleaned = text.trim()
  if (cleaned.length <= maxLength) return cleaned

  const targetLength = maxLength - 3
  let truncated = cleaned.slice(0, targetLength)

  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > targetLength * 0.7) {
    truncated = truncated.slice(0, lastSpace)
  }

  return `${truncated.trim()}...`
}

/**
 * Returns canonical site base URL.
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl.replace(/\/$/, '') : `https://${envUrl.replace(/\/$/, '')}`
  }
  return 'https://yarlsamayal.com'
}

export interface ProductImageItem {
  id?: string
  url: string
  sort_order?: number | null
  is_main?: boolean | null
  cloudinary_public_id?: string | null
  variation_id?: string | null
}

export interface ProductVariationItem {
  id: string
  is_active?: boolean | null
}

export interface ProductCardImagesInput {
  has_variations?: boolean
  product_images?: ProductImageItem[] | null
  product_variations?: ProductVariationItem[] | null
}

export interface ProductCardImagesResult {
  mainImage: ProductImageItem | null
  hoverImage: ProductImageItem | null
}

/**
 * Resolves main product image and hover product image (next in sort_order) respecting variation-scoped logic.
 */
export function getProductCardImages(product?: ProductCardImagesInput | null): ProductCardImagesResult {
  const images = product?.product_images || []
  if (!images || images.length === 0) {
    return { mainImage: null, hoverImage: null }
  }

  const activeVariations = (product?.product_variations || []).filter((v) => v.is_active !== false)

  let scopedImages: ProductImageItem[] = []

  if (product?.has_variations && activeVariations.length > 0) {
    const firstVarId = activeVariations[0].id
    scopedImages = images.filter((i) => i.variation_id === firstVarId)
    if (scopedImages.length === 0) {
      scopedImages = images.filter((i) => !i.variation_id)
    }
    if (scopedImages.length === 0) {
      scopedImages = images
    }
  } else {
    scopedImages = images.filter((i) => !i.variation_id)
    if (scopedImages.length === 0) {
      scopedImages = images
    }
  }

  const sortedScopedImages = [...scopedImages].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  const mainImage = sortedScopedImages.find((i) => i.is_main) || sortedScopedImages[0] || null

  if (!mainImage) {
    return { mainImage: null, hoverImage: null }
  }

  const mainIndex = sortedScopedImages.findIndex((i) =>
    i.id && mainImage.id ? i.id === mainImage.id : i === mainImage
  )

  const hoverImage =
    mainIndex !== -1 && mainIndex + 1 < sortedScopedImages.length
      ? sortedScopedImages[mainIndex + 1]
      : null

  return { mainImage, hoverImage }
}

/**
 * Resolves main product image URL respecting variation-scoped main image logic.
 */
export function getProductMainImageUrl(product: ProductCardImagesInput | null | undefined): string | null {
  const { mainImage } = getProductCardImages(product)
  return mainImage ? mainImage.url : null
}

