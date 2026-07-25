import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/search/searchProducts'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q || q.trim().length < 2) {
    return NextResponse.json({
      query: q,
      products: [],
      matchedCategory: null,
      totalMatches: 0,
    })
  }

  try {
    const result = await searchProducts(q)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const errObj = error as { message?: string }
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search', message: errObj?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
