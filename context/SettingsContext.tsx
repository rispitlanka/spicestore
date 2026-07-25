'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { SiteSettings, DEFAULT_SETTINGS, parseSettingsRows } from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'

interface SettingsContextType {
  settings: SiteSettings
  loading: boolean
  refreshSettings: () => Promise<SiteSettings>
  /* eslint-disable @typescript-eslint/no-explicit-any */
  updateSetting: (key: string, value: any) => Promise<boolean>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refreshSettings: async () => DEFAULT_SETTINGS,
  updateSetting: async () => false,
})

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient() as any
      const { data, error } = await supabase.from('settings').select('key, value')
      if (!error && data) {
        const parsed = parseSettingsRows(data)
        setSettings(parsed)
        return parsed
      }
    } catch (err) {
      console.error('Error fetching settings in provider:', err)
    } finally {
      setLoading(false)
    }
    return DEFAULT_SETTINGS
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = async (key: string, value: any): Promise<boolean> => {
    try {
      const supabase = createClient() as any
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

      if (error) {
        console.error(`Failed to update setting key "${key}":`, error.message)
        return false
      }
      await fetchSettings()
      try {
        await fetch('/api/admin/revalidate-settings', { method: 'POST' })
      } catch (e) {
        console.warn('Revalidation endpoint error:', e)
      }
      return true
    } catch (err) {
      console.error(`Error updating setting key "${key}":`, err)
      return false
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
