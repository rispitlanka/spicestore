import { createClient } from '@/lib/supabase/server'
import { getSiteSettings, DEFAULT_HERO_SLIDER_CONFIG, HeroSliderConfigSetting } from '@/lib/settings'
import { HeroSlide } from '@/types/database'
import { HeroSliderClient } from './HeroSliderClient'

interface HeroSliderProps {
  slides?: HeroSlide[]
  config?: HeroSliderConfigSetting
}

export async function HeroSlider({ slides: propSlides, config: propConfig }: HeroSliderProps) {
  let slides: HeroSlide[] = propSlides || []
  let config: HeroSliderConfigSetting = propConfig || DEFAULT_HERO_SLIDER_CONFIG

  if (!propSlides || !propConfig) {
    try {
      const settings = await getSiteSettings()
      config = propConfig || settings.hero_slider_config || DEFAULT_HERO_SLIDER_CONFIG

      if (!propSlides) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const supabase = (await createClient()) as any
        const { data: dbSlides, error } = await supabase
          .from('hero_slides')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (!error && dbSlides && Array.isArray(dbSlides) && dbSlides.length > 0) {
          slides = dbSlides as HeroSlide[]
        } else {
          // Check settings key fallback for hero_slides
          const { data: settingRow } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'hero_slides')
            .maybeSingle()

          if (settingRow && Array.isArray(settingRow.value)) {
            slides = (settingRow.value as HeroSlide[]).filter((s) => s && s.is_active)
          }
        }
      }
    } catch (err) {
      console.error('Error loading HeroSlider data:', err)
    }
  }

  if (!slides || slides.length === 0) {
    return null
  }

  return <HeroSliderClient slides={slides} config={config} />
}
