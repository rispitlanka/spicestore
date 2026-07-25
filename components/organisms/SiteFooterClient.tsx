'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SiteSettings, PublishedLegalPageItem } from '@/lib/settings'
import { useSettings } from '@/context/SettingsContext'
import { SiteFooterUI } from './SiteFooterUI'
import { fetchVisibleNavMenuItems, ResolvedMenuItem } from '@/lib/menu'

export interface SiteFooterClientProps {
  initialSettings?: SiteSettings
  initialLegalPages?: PublishedLegalPageItem[]
}

export const SiteFooterClient: React.FC<SiteFooterClientProps> = ({
  initialSettings,
  initialLegalPages = [],
}) => {
  const pathname = usePathname()
  const { settings: contextSettings } = useSettings()

  const [shopMenuItems, setShopMenuItems] = useState<ResolvedMenuItem[]>([])

  useEffect(() => {
    let isMounted = true
    const loadShopMenu = async () => {
      try {
        const fetched = await fetchVisibleNavMenuItems('footer_shop')
        if (isMounted && fetched) {
          setShopMenuItems(fetched)
        }
      } catch (err) {
        console.warn('Failed to fetch footer shop menu items:', err)
      }
    }
    loadShopMenu()
    return () => {
      isMounted = false
    }
  }, [contextSettings])

  // Hide footer on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }

  const effectiveSettings = initialSettings || contextSettings

  return (
    <SiteFooterUI
      siteIdentity={effectiveSettings.site_identity}
      footerAbout={effectiveSettings.footer_about}
      footerContact={effectiveSettings.footer_contact}
      footerSocial={effectiveSettings.footer_social}
      footerCopyright={effectiveSettings.footer_copyright}
      footerLayout={effectiveSettings.footer_layout}
      legalPages={initialLegalPages}
      shopMenuItems={shopMenuItems}
    />
  )
}
