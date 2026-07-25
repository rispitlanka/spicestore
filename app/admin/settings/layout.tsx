'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/context/SettingsContext'
import { Button } from '@/components/atoms/Button'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { refreshSettings } = useSettings()

  const tabs = [
    {
      name: 'General',
      href: '/admin/settings/general',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: 'Orders',
      href: '/admin/settings/orders',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      name: 'Store & Currency',
      href: '/admin/settings/store',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 12v-2m0 0c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Footer',
      href: '/admin/settings/footer',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      name: 'Menu',
      href: '/admin/settings/menu',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-[#1C2521]">
      {/* Header */}
      <div className="border-b border-[#E7ECE8] pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-[#1C2521] tracking-tight">
            Settings
          </h1>
          <p className="mt-1 text-xs text-[#6B7570] font-normal">
            Manage site-wide preferences, currency symbol, order numbering, footers, and menu navigation.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => refreshSettings()}>
          Refresh Settings
        </Button>
      </div>

      {/* Main Settings Body: Sidebar (Desktop) / Tabs (Mobile) + Sub-Page Content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sub-Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
          {/* Horizontal scroll strip on mobile */}
          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible space-x-1 md:space-x-0 md:space-y-1 pb-2 md:pb-0 border-b md:border-b-0 border-[#E7ECE8]">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname === `${tab.href}/`
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center px-3.5 py-2.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                    isActive
                      ? 'bg-[#2F6B3C] text-white font-semibold shadow-xs'
                      : 'text-[#1C2521] hover:text-[#2F6B3C] hover:bg-[#F4F6F4]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Sub-Section Form Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
