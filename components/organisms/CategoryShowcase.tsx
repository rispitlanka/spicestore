import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HomepageCategoryWithCategory } from '@/types/database'

interface CategoryItem {
  id: string
  name: string
  slug: string
}

interface CategoryShowcaseProps {
  categories?: CategoryItem[]
  currentCategory?: string
  sort?: string
}

export async function CategoryShowcase({
  categories = [],
  currentCategory,
  sort,
}: CategoryShowcaseProps) {
  let showcaseItems: HomepageCategoryWithCategory[] = []

  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const supabase = (await createClient()) as any

    // 1. Try querying homepage_categories DB table
    const { data: dbData, error: dbErr } = await supabase
      .from('homepage_categories')
      .select(`
        *,
        categories (id, name, slug, is_active)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!dbErr && dbData && Array.isArray(dbData) && dbData.length > 0) {
      showcaseItems = (dbData as HomepageCategoryWithCategory[]).filter(
        (item) => item.is_active && item.categories && item.categories.is_active
      )
    } else {
      // 2. Fallback: try querying settings table key 'homepage_categories'
      const { data: settingRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'homepage_categories')
        .maybeSingle()

      if (settingRow && Array.isArray(settingRow.value)) {
        showcaseItems = (settingRow.value as HomepageCategoryWithCategory[]).filter(
          (item) => item && item.is_active && item.categories && item.categories.is_active
        )
      }
    }
  } catch (err) {
    console.error('Error fetching CategoryShowcase items:', err)
  }

  // Fallback: If no active showcase entries exist, render the classic plain text category tabs
  if (!showcaseItems || showcaseItems.length === 0) {
    return (
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto border-b border-[#E7ECE8] pb-1 text-sm no-scrollbar">
        <Link
          href={sort ? `/?sort=${sort}` : '/'}
          className={
            !currentCategory
              ? 'text-[#2F6B3C] font-semibold border-b-2 border-[#2F6B3C] pb-2 -mb-1 whitespace-nowrap min-h-[44px] inline-flex items-center'
              : 'text-[#6B7570] hover:text-[#1C2521] font-normal transition-colors pb-2 whitespace-nowrap min-h-[44px] inline-flex items-center'
          }
        >
          All Products
        </Link>

        {categories.map((cat) => {
          const isSelected = currentCategory === cat.slug
          const href = sort ? `/?category=${cat.slug}&sort=${sort}` : `/?category=${cat.slug}`
          return (
            <Link
              key={cat.id}
              href={href}
              className={
                isSelected
                  ? 'text-[#2F6B3C] font-semibold border-b-2 border-[#2F6B3C] pb-2 -mb-1 whitespace-nowrap min-h-[44px] inline-flex items-center'
                  : 'text-[#6B7570] hover:text-[#1C2521] font-normal transition-colors pb-2 whitespace-nowrap min-h-[44px] inline-flex items-center'
              }
            >
              {cat.name}
            </Link>
          )
        })}
      </div>
    )
  }

  // Primary rendering: Minimal image-based category showcase
  return (
    <div className="w-full">
      {/* Horizontal scroll strip on mobile, flex/grid on desktop */}
      <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-2 sm:pb-0 no-scrollbar snap-x">
        {showcaseItems.map((item) => {
          if (!item.categories) return null
          const slug = item.categories.slug
          const name = item.categories.name

          return (
            <Link
              key={item.id}
              href={`/category/${slug}`}
              className="group flex flex-col items-center shrink-0 w-28 sm:w-36 md:w-40 snap-start transition-transform hover:-translate-y-0.5 focus:outline-none"
            >
              {/* Square / Fixed aspect-ratio image tile */}
              <div className="relative w-full aspect-square bg-[#F4F6F4] border border-[#E7ECE8] rounded-sm overflow-hidden transition-all duration-200 group-hover:border-[#2F6B3C]/40 group-hover:shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Minimal category label below image */}
              <span className="mt-2.5 text-xs sm:text-sm font-medium text-[#1C2521] text-center tracking-tight line-clamp-1 transition-colors group-hover:text-[#2F6B3C]">
                {name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
