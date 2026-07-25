'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { formatPriceWithSymbol } from '@/lib/settings'
import { SearchProductItem, MatchedCategory } from '@/lib/search/searchProducts'
import { CurrencySwitcher } from '@/components/molecules/CurrencySwitcher'
import { fetchVisibleNavMenuItems, ResolvedMenuItem } from '@/lib/menu'

export const DEFAULT_NAV_LINKS: ResolvedMenuItem[] = [
  { id: 'def-1', label: 'Curry Powders', link_type: 'category', sort_order: 0, is_visible: true, menu_location: 'header', href: '/category/curry-powders' },
  { id: 'def-2', label: 'Spices', link_type: 'category', sort_order: 1, is_visible: true, menu_location: 'header', href: '/category/spices' },
  { id: 'def-3', label: 'Snacks', link_type: 'category', sort_order: 2, is_visible: true, menu_location: 'header', href: '/category/snacks' },
  { id: 'def-4', label: 'Preserves', link_type: 'category', sort_order: 3, is_visible: true, menu_location: 'header', href: '/category/preserves' },
  { id: 'def-5', label: 'All Products', link_type: 'custom_url', custom_url: '/', sort_order: 4, is_visible: true, menu_location: 'header', href: '/' },
]

export const SiteHeader: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { openCart, totalItems, isHydrated } = useCart()
  const { user } = useAuth()
  const { settings } = useSettings()

  const [navItems, setNavItems] = useState<ResolvedMenuItem[]>(DEFAULT_NAV_LINKS)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProductItem[]>([])
  const [matchedCategory, setMatchedCategory] = useState<MatchedCategory | null>(null)
  const [totalMatches, setTotalMatches] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)

  const logoUrl = settings?.site_identity?.logo_url?.trim() || '/logo.png'
  const siteTitle = settings?.site_identity?.site_title?.trim() || 'Yarl Samayal'
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [logoUrl])

  // Fetch dynamic navigation menu items from DB
  useEffect(() => {
    let isMounted = true
    const loadNav = async () => {
      try {
        const fetched = await fetchVisibleNavMenuItems()
        if (isMounted && fetched && fetched.length > 0) {
          setNavItems(fetched)
        }
      } catch (err) {
        console.warn('Failed to load menu items in SiteHeader:', err)
      }
    }
    loadNav()
    return () => {
      isMounted = false
    }
  }, [settings])

  // Automatically close mobile menu and search dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setShowDropdown(false)
  }, [pathname])

  // Debounced 300ms live search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setMatchedCategory(null)
      setTotalMatches(0)
      setShowDropdown(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.products || [])
          setMatchedCategory(data.matchedCategory || null)
          setTotalMatches(data.totalMatches || 0)
          setShowDropdown(true)
        }
      } catch (err) {
        console.error('Failed to fetch search results:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle outside click & Escape key to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false)
        if (!searchQuery) {
          setSearchExpanded(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [searchQuery])

  // Hide header on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }

  const closeSearch = () => {
    setShowDropdown(false)
    setSearchExpanded(false)
    setMobileMenuOpen(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
      closeSearch()
    } else {
      setShowDropdown(false)
      setSearchExpanded(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E7ECE8] font-sans">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Hamburger (Mobile) + Brand Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle (Below md width) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-[#1C2521] hover:text-[#2F6B3C] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <Link href="/" className="flex items-center min-h-[44px]">
            {!imgError && logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={siteTitle}
                onError={() => setImgError(true)}
                className="h-8 sm:h-9 w-auto object-contain"
              />
            ) : (
              <span className="text-base sm:text-lg font-semibold tracking-tight text-[#1C2521] uppercase">
                {siteTitle}
              </span>
            )}
          </Link>
        </div>

        {/* Center: Desktop dynamic nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || (item.href !== '#' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.id || item.label}
                href={item.href}
                className={
                  isActive
                    ? 'text-[#2F6B3C] font-semibold border-b-2 border-[#2F6B3C] py-5 flex items-center'
                    : 'text-[#1C2521] hover:text-[#2F6B3C] font-normal transition-colors py-5 flex items-center'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: Search, Account, Cart */}
        <div className="flex items-center gap-3 sm:gap-5 text-sm">
          {/* Search Icon / Expandable Search Input */}
          <div ref={searchRef} className="relative flex items-center">
            {searchExpanded ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0 || searchQuery.trim().length >= 2) {
                      setShowDropdown(true)
                    }
                  }}
                  className="w-44 sm:w-64 min-h-[40px] rounded-[4px] border border-[#E7ECE8] bg-white px-3 py-1 text-xs text-[#1C2521] focus:border-[#2F6B3C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchExpanded(false)
                    setSearchQuery('')
                    setShowDropdown(false)
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-[#6B7570] hover:text-[#1C2521] cursor-pointer"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                aria-label="Search"
                className="text-[#1C2521] hover:text-[#2F6B3C] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Minimal Search Dropdown */}
            {searchExpanded && showDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-[#E7ECE8] z-50 overflow-hidden text-xs text-[#1C2521]">
                {/* Category Match suggestion if available */}
                {matchedCategory && (
                  <Link
                    href={`/category/${matchedCategory.slug}`}
                    onClick={closeSearch}
                    className="flex items-center justify-between px-3 py-2 bg-[#F4F6F4] border-b border-[#E7ECE8] hover:bg-[#E7ECE8]/50 transition-colors text-[#2F6B3C] font-medium"
                  >
                    <span>Category: {matchedCategory.name}</span>
                    <span className="text-[10px] text-[#6B7570]">View Category →</span>
                  </Link>
                )}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="px-3 py-3 text-center text-[#6B7570]">Searching...</div>
                )}

                {/* Results List */}
                {!isLoading && searchResults.length > 0 && (
                  <div className="divide-y divide-[#E7ECE8]">
                    {searchResults.slice(0, 6).map((item) => {
                      const displayPrice =
                        item.min_price > 0 && item.min_price < item.max_price
                          ? `${formatPriceWithSymbol(item.min_price, settings.store_currency.symbol)} - ${formatPriceWithSymbol(item.max_price, settings.store_currency.symbol)}`
                          : formatPriceWithSymbol(item.effectivePrice, settings.store_currency.symbol)

                      return (
                        <Link
                          key={item.id}
                          href={`/products/${item.slug}`}
                          onClick={closeSearch}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F4F6F4] transition-colors"
                        >
                          {/* Product Thumbnail */}
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-9 h-9 object-cover rounded-[2px] bg-[#F4F6F4] shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-[#F4F6F4] rounded-[2px] shrink-0 flex items-center justify-center text-[10px] text-[#6B7570]">
                              No img
                            </div>
                          )}

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#1C2521] truncate">{item.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[#2F6B3C] font-semibold">{displayPrice}</span>
                              {item.is_out_of_stock && (
                                <span className="text-[10px] text-[#C84B31] font-medium">Out of stock</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="px-3 py-4 text-center text-[#6B7570]">
                    No products found for &quot;{searchQuery.trim()}&quot;
                  </div>
                )}

                {/* "See all results" Footer Link */}
                {!isLoading && (searchResults.length > 0 || totalMatches > 0) && (
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={closeSearch}
                    className="block w-full text-center py-2 px-3 bg-[#F4F6F4] text-[#2F6B3C] font-medium border-t border-[#E7ECE8] hover:bg-[#E7ECE8]/60 transition-colors"
                  >
                    See all results for &quot;{searchQuery.trim()}&quot; ({totalMatches})
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Currency Switcher */}
          <CurrencySwitcher />

          {/* Account */}
          <Link
            href={user ? '/account' : '/account/login'}
            className="text-[#1C2521] hover:text-[#2F6B3C] transition-colors font-normal min-h-[44px] flex items-center px-1"
          >
            {user ? 'Account' : 'Sign in'}
          </Link>

          {/* Cart */}
          <button
            type="button"
            onClick={openCart}
            className="text-[#1C2521] hover:text-[#2F6B3C] transition-colors font-normal cursor-pointer flex items-center gap-1 min-h-[44px] px-1"
          >
            <span>Cart</span>
            <span className="text-[#2F6B3C] font-medium bg-[#2F6B3C]/10 px-2 py-0.5 rounded-full text-xs">
              {isHydrated ? totalItems : 0}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-[#E7ECE8] bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || (item.href !== '#' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.id || item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center min-h-[44px] px-3 py-2 text-sm rounded-[4px] transition-colors ${
                  isActive
                    ? 'text-[#2F6B3C] font-semibold bg-[#2F6B3C]/5 border-l-2 border-[#2F6B3C]'
                    : 'text-[#1C2521] font-normal hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
