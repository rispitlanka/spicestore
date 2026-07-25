'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/atoms/Button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/'

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isLoginPage) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || null)
      }
    })
  }, [isLoginPage])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
    },
    {
      name: 'Orders',
      href: '/admin/orders',
    },
    {
      name: 'Customers',
      href: '/admin/customers',
    },
    {
      name: 'Products',
      href: '/admin/products',
    },
    {
      name: 'Categories',
      href: '/admin/categories',
    },
    {
      name: 'Shipping Tiers',
      href: '/admin/shipping',
    },
    {
      name: 'Coupons',
      href: '/admin/coupons',
    },
    {
      name: 'Legal Pages',
      href: '/admin/legal',
    },
    {
      name: 'Settings',
      href: '/admin/settings',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-[#1C2521] flex flex-col md:flex-row font-sans">
      {/* Sidebar (Desktop) & Collapsible Header (Mobile/Tablet) */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E7ECE8] flex flex-col shrink-0">
        <div className="p-4 sm:p-6 border-b border-[#E7ECE8] flex items-center justify-between">
          <Link href="/admin" className="flex flex-col">
            <span className="text-base font-semibold text-[#1C2521] tracking-tight">
              YARL SAMAYAL
            </span>
            <span className="text-xs text-[#2F6B3C] font-medium">
              Admin Panel
            </span>
          </Link>

          {/* Toggle for mobile/tablet screen widths */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-[#1C2521] hover:text-[#2F6B3C] cursor-pointer"
            aria-label="Toggle admin menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <div className={`${mobileNavOpen ? 'block' : 'hidden'} md:block flex-1 flex flex-col justify-between`}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin' || pathname === '/admin/'
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2.5 rounded-[4px] text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                    isActive
                      ? 'text-[#2F6B3C] border-l-2 border-[#2F6B3C] pl-2.5 font-semibold bg-[#2F6B3C]/5'
                      : 'text-[#1C2521] hover:text-[#2F6B3C] hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[#E7ECE8] space-y-3 bg-white">
            {userEmail && (
              <div className="text-xs truncate">
                <span className="text-[#6B7570] block">Signed in as</span>
                <span className="font-medium text-[#1C2521] truncate block">{userEmail}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Link href="/" target="_blank">
                <Button variant="secondary" size="sm" className="w-full min-h-[44px]">
                  View Public Store
                </Button>
              </Link>

              <Button
                variant="text"
                size="sm"
                onClick={handleSignOut}
                className="w-full min-h-[44px] flex items-center justify-center"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-8 bg-white">
        {children}
      </main>
    </div>
  )
}
