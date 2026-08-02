-- ============================================================================
-- Migration Name: 20260726000002_hero_slides.sql
-- Description: Creates hero_slides table, RLS policies, seeds default slider config and initial slide.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hero_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT,
    link_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.hero_slides IS 'Homepage hero slider slides configurable by admins.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hero slides, admin read all" ON public.hero_slides;
CREATE POLICY "Public read active hero slides, admin read all"
    ON public.hero_slides FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admin write hero slides" ON public.hero_slides;
CREATE POLICY "Admin write hero slides"
    ON public.hero_slides FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Seed default hero_slider_config setting if not present
INSERT INTO public.settings (key, value)
VALUES ('hero_slider_config', '{"height_desktop_px": 400, "height_mobile_px": 220}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed initial hero slide row if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.hero_slides) THEN
        INSERT INTO public.hero_slides (image_url, link_url, sort_order, is_active)
        VALUES ('https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80', NULL, 0, TRUE);
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
