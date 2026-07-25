import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { CurrencyProvider } from '@/context/CurrencyContext'
import { SiteHeader, SiteFooter, CartDrawer } from '@/components/organisms'

import { getSiteSettings } from '@/lib/settings'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteIdentity = settings.site_identity

  const title = siteIdentity?.site_title?.trim() || 'Yarl Samayal'
  const tagline = siteIdentity?.site_tagline?.trim()
  const defaultTitle = tagline ? `${title} - ${tagline}` : `${title} - Authentic Jaffna Spices & Snacks`
  const description = siteIdentity?.meta_description?.trim() || 'Authentic Jaffna spice blends, savory snacks, and traditional Sri Lankan delicacies.'
  const faviconUrl = siteIdentity?.favicon_url?.trim() || '/favicon.ico'

  return {
    title: {
      default: defaultTitle,
      template: `%s | ${title}`,
    },
    description,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-[#1C2521] flex flex-col font-sans">
        <AuthProvider>
          <SettingsProvider>
            <CurrencyProvider>
              <CartProvider>
                <SiteHeader />
                <div className="flex-1">{children}</div>
                <SiteFooter />
                <CartDrawer />
              </CartProvider>
            </CurrencyProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
