import React from 'react'
import { getSiteSettings, getPublishedLegalPages } from '@/lib/settings'
import { SiteFooterClient } from './SiteFooterClient'

export async function SiteFooter() {
  const settings = await getSiteSettings()
  const legalPages = await getPublishedLegalPages()

  return <SiteFooterClient initialSettings={settings} initialLegalPages={legalPages} />
}
