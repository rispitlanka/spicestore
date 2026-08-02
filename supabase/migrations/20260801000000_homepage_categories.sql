-- ============================================================================
-- Migration Name: 20260801000000_homepage_categories.sql
-- Description: Creates homepage_categories table, RLS policies for homepage category showcase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.homepage_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (category_id)
);

COMMENT ON TABLE public.homepage_categories IS 'Admin-configurable homepage showcase categories.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.homepage_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active homepage categories, admin read all" ON public.homepage_categories;
CREATE POLICY "Public read active homepage categories, admin read all"
    ON public.homepage_categories FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admin write homepage categories" ON public.homepage_categories;
CREATE POLICY "Admin write homepage categories"
    ON public.homepage_categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
