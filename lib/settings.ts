import { cache } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SiteIdentitySetting {
  logo_url: string
  favicon_url: string
  site_title: string
  site_tagline: string
  meta_description: string
}

export interface FooterAboutSetting {
  logo_url: string
  tagline: string
  description: string
}

export interface FooterContactSetting {
  email: string
  phone: string
  whatsapp: string
  address: string
}

export interface FooterSocialSetting {
  facebook: string
  instagram: string
  tiktok: string
  youtube: string
}

export interface FooterCopyrightSetting {
  text: string
}

export type FooterContentType = 'about' | 'legal' | 'contact' | 'shop_menu'

export interface FooterLayoutColumn {
  content_type: FooterContentType
  width_percent: number
}

export interface FooterLayoutSetting {
  columns: FooterLayoutColumn[]
}

export interface HeroSliderConfigSetting {
  height_desktop_px: number
  height_mobile_px: number
}

export interface AnnouncementBarMessage {
  text: string
  link_url?: string
}

export interface AnnouncementBarSetting {
  is_active: boolean
  messages: AnnouncementBarMessage[]
  background_color: string
  text_color: string
  dismissible: boolean
}

export interface SiteSettings {
  low_stock_threshold: number
  store_currency: {
    code: string
    symbol: string
  }
  order_number_prefix: string
  store_contact_email: string
  store_contact_phone: string
  default_shipping_note: string
  site_identity: SiteIdentitySetting
  footer_about: FooterAboutSetting
  footer_contact: FooterContactSetting
  footer_social: FooterSocialSetting
  footer_copyright: FooterCopyrightSetting
  footer_layout: FooterLayoutSetting
  hero_slider_config: HeroSliderConfigSetting
  announcement_bar: AnnouncementBarSetting
}

export const DEFAULT_SITE_IDENTITY: SiteIdentitySetting = {
  logo_url: '',
  favicon_url: '',
  site_title: 'Yarl Samayal',
  site_tagline: 'Authentic Jaffna Spices & Snacks',
  meta_description: 'Authentic Jaffna spice blends, savory snacks, and traditional Sri Lankan delicacies.',
}

export const DEFAULT_FOOTER_ABOUT: FooterAboutSetting = {
  logo_url: '',
  tagline: 'Authentic Jaffna Spices & Regional Specialties',
  description: 'Handcrafted traditional spice blends, curry powders, and authentic Jaffna delicacies delivered worldwide directly from Sri Lanka.',
}

export const DEFAULT_FOOTER_CONTACT: FooterContactSetting = {
  email: 'info@yarlsamayal.com',
  phone: '+94 77 123 4567',
  whatsapp: '+94 77 123 4567',
  address: 'Main Street, Jaffna, Sri Lanka',
}

export const DEFAULT_FOOTER_SOCIAL: FooterSocialSetting = {
  facebook: '',
  instagram: '',
  tiktok: '',
  youtube: '',
}

export const DEFAULT_FOOTER_COPYRIGHT: FooterCopyrightSetting = {
  text: '© {year} Yarl Samayal. All rights reserved.',
}

export const DEFAULT_FOOTER_LAYOUT: FooterLayoutSetting = {
  columns: [
    { content_type: 'about', width_percent: 30 },
    { content_type: 'shop_menu', width_percent: 20 },
    { content_type: 'legal', width_percent: 20 },
    { content_type: 'contact', width_percent: 30 },
  ],
}

export const DEFAULT_HERO_SLIDER_CONFIG: HeroSliderConfigSetting = {
  height_desktop_px: 400,
  height_mobile_px: 220,
}

export const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarSetting = {
  is_active: false,
  messages: [
    { text: 'Free shipping on orders above $50', link_url: '' }
  ],
  background_color: '#2F6B3C',
  text_color: '#FFFFFF',
  dismissible: true,
}

export const DEFAULT_SETTINGS: SiteSettings = {
  low_stock_threshold: 5,
  store_currency: {
    code: 'USD',
    symbol: '$',
  },
  order_number_prefix: 'YS',
  store_contact_email: '',
  store_contact_phone: '',
  default_shipping_note: 'Cash on Delivery • Ships internationally',
  site_identity: DEFAULT_SITE_IDENTITY,
  footer_about: DEFAULT_FOOTER_ABOUT,
  footer_contact: DEFAULT_FOOTER_CONTACT,
  footer_social: DEFAULT_FOOTER_SOCIAL,
  footer_copyright: DEFAULT_FOOTER_COPYRIGHT,
  footer_layout: DEFAULT_FOOTER_LAYOUT,
  hero_slider_config: DEFAULT_HERO_SLIDER_CONFIG,
  announcement_bar: DEFAULT_ANNOUNCEMENT_BAR,
}

/**
 * Helper to format a numeric amount using the store currency symbol
 */
export function formatPriceWithSymbol(amount: number, symbol: string = '$'): string {
  const num = Number(amount || 0)
  return `${symbol}${num.toFixed(2)}`
}

/**
 * Raw helper to map database key-value array into typed SiteSettings object
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseSettingsRows(rows: Array<{ key: string; value: any }> | null): SiteSettings {
  if (!rows || rows.length === 0) return { ...DEFAULT_SETTINGS }

  const settingsMap = new Map<string, any>(rows.map((r) => [r.key, r.value]))

  const getNumVal = (key: string, defaultVal: number): number => {
    const raw = settingsMap.get(key)
    if (typeof raw === 'number') return raw
    if (raw && typeof raw.value === 'number') return raw.value
    if (raw && typeof raw.value === 'string') {
      const parsed = parseInt(raw.value, 10)
      if (!isNaN(parsed)) return parsed
    }
    return defaultVal
  }

  const getStrVal = (key: string, defaultVal: string): string => {
    const raw = settingsMap.get(key)
    if (typeof raw === 'string') return raw
    if (raw && typeof raw.value === 'string') return raw.value
    return defaultVal
  }

  const getCurrencyVal = (defaultVal: { code: string; symbol: string }) => {
    const raw = settingsMap.get('store_currency')
    if (raw && typeof raw === 'object') {
      return {
        code: raw.code || defaultVal.code,
        symbol: raw.symbol || defaultVal.symbol,
      }
    }
    return defaultVal
  }

  const getObjectVal = <T extends Record<string, any>>(key: string, defaultVal: T): T => {
    const raw = settingsMap.get(key)
    if (!raw) return defaultVal
    if (typeof raw === 'object') {
      if (raw.value && typeof raw.value === 'object') {
        return { ...defaultVal, ...raw.value }
      }
      return { ...defaultVal, ...raw }
    }
    return defaultVal
  }

  const getLayoutVal = (defaultVal: FooterLayoutSetting): FooterLayoutSetting => {
    const raw = settingsMap.get('footer_layout')
    if (!raw) return defaultVal
    const obj = raw.value && typeof raw.value === 'object' ? raw.value : raw
    if (obj && Array.isArray(obj.columns) && obj.columns.length > 0) {
      const validColumns = obj.columns
        .filter((c: any) => c && typeof c === 'object' && ['about', 'legal', 'contact', 'shop_menu'].includes(c.content_type))
        .map((c: any) => ({
          content_type: c.content_type as FooterContentType,
          width_percent: Number(c.width_percent) || 25,
        }))
      if (validColumns.length > 0) {
        return { columns: validColumns }
      }
    }
    return defaultVal
  }

  const getAnnouncementBarVal = (defaultVal: AnnouncementBarSetting): AnnouncementBarSetting => {
    const raw = settingsMap.get('announcement_bar')
    if (!raw) return defaultVal
    const obj = raw.value && typeof raw.value === 'object' ? raw.value : raw
    if (obj && typeof obj === 'object') {
      const parsedMessages = Array.isArray(obj.messages)
        ? obj.messages
            .filter((m: any) => m && typeof m.text === 'string' && m.text.trim().length > 0)
            .map((m: any) => ({
              text: m.text.trim(),
              link_url: typeof m.link_url === 'string' ? m.link_url.trim() : '',
            }))
        : defaultVal.messages

      return {
        is_active: typeof obj.is_active === 'boolean' ? obj.is_active : defaultVal.is_active,
        messages: parsedMessages.length > 0 ? parsedMessages : defaultVal.messages,
        background_color: typeof obj.background_color === 'string' && obj.background_color.trim() ? obj.background_color.trim() : defaultVal.background_color,
        text_color: typeof obj.text_color === 'string' && obj.text_color.trim() ? obj.text_color.trim() : defaultVal.text_color,
        dismissible: typeof obj.dismissible === 'boolean' ? obj.dismissible : defaultVal.dismissible,
      }
    }
    return defaultVal
  }

  return {
    low_stock_threshold: getNumVal('low_stock_threshold', DEFAULT_SETTINGS.low_stock_threshold),
    store_currency: getCurrencyVal(DEFAULT_SETTINGS.store_currency),
    order_number_prefix: getStrVal('order_number_prefix', DEFAULT_SETTINGS.order_number_prefix),
    store_contact_email: getStrVal('store_contact_email', DEFAULT_SETTINGS.store_contact_email),
    store_contact_phone: getStrVal('store_contact_phone', DEFAULT_SETTINGS.store_contact_phone),
    default_shipping_note: getStrVal('default_shipping_note', DEFAULT_SETTINGS.default_shipping_note),
    site_identity: getObjectVal<SiteIdentitySetting>('site_identity', DEFAULT_SETTINGS.site_identity),
    footer_about: getObjectVal<FooterAboutSetting>('footer_about', DEFAULT_SETTINGS.footer_about),
    footer_contact: getObjectVal<FooterContactSetting>('footer_contact', DEFAULT_SETTINGS.footer_contact),
    footer_social: getObjectVal<FooterSocialSetting>('footer_social', DEFAULT_SETTINGS.footer_social),
    footer_copyright: getObjectVal<FooterCopyrightSetting>('footer_copyright', DEFAULT_SETTINGS.footer_copyright),
    footer_layout: getLayoutVal(DEFAULT_FOOTER_LAYOUT),
    hero_slider_config: getObjectVal<HeroSliderConfigSetting>('hero_slider_config', DEFAULT_SETTINGS.hero_slider_config),
    announcement_bar: getAnnouncementBarVal(DEFAULT_ANNOUNCEMENT_BAR),
  }
}

/**
 * React cache wrapped server-side settings fetcher
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = createClient() as any
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error || !data) {
      console.warn('Failed to load settings from DB, using defaults:', error?.message)
      return DEFAULT_SETTINGS
    }
    return parseSettingsRows(data)
  } catch (err) {
    console.error('Error fetching settings:', err)
    return DEFAULT_SETTINGS
  }
})

/**
 * React cache wrapped server-side published legal pages fetcher for footer
 */
export interface PublishedLegalPageItem {
  id: string
  title: string
  slug: string
}

export const getPublishedLegalPages = cache(async (): Promise<PublishedLegalPageItem[]> => {
  try {
    const supabase = createClient() as any
    const { data, error } = await supabase
      .from('legal_pages')
      .select('id, title, slug')
      .eq('is_published', true)
      .order('title', { ascending: true })

    if (error || !data) {
      console.warn('Failed to fetch published legal pages for footer:', error?.message)
      return []
    }
    return data as PublishedLegalPageItem[]
  } catch (err) {
    console.error('Error fetching legal pages for footer:', err)
    return []
  }
})
