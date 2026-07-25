-- ============================================================================
-- Migration Name: 20260725000010_menu_items.sql
-- Description: Creates menu_items table, RLS policies, and seeds initial nav items.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    link_type TEXT NOT NULL CHECK (link_type IN ('category', 'legal_page', 'custom_url', 'product')),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    legal_page_slug TEXT REFERENCES public.legal_pages(slug) ON DELETE CASCADE ON UPDATE CASCADE,
    custom_url TEXT,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_menu_item_link_target CHECK (
        (link_type = 'category' AND category_id IS NOT NULL) OR
        (link_type = 'legal_page' AND legal_page_slug IS NOT NULL) OR
        (link_type = 'custom_url' AND custom_url IS NOT NULL) OR
        (link_type = 'product' AND product_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.menu_items IS 'Header navigation menu items editable by admins.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active menu items, admin read all" ON public.menu_items;
CREATE POLICY "Public read active menu items, admin read all"
    ON public.menu_items FOR SELECT
    USING (is_visible = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admin write menu items" ON public.menu_items;
CREATE POLICY "Admin write menu items"
    ON public.menu_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Seed initial rows matching current storefront header navigation if table is empty
DO $$
DECLARE
    curry_id UUID;
    spices_id UUID;
    snacks_id UUID;
    preserves_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.menu_items) THEN
        SELECT id INTO curry_id FROM public.categories WHERE slug = 'curry-powders' LIMIT 1;
        SELECT id INTO spices_id FROM public.categories WHERE slug = 'spices' LIMIT 1;
        SELECT id INTO snacks_id FROM public.categories WHERE slug = 'snacks' LIMIT 1;
        SELECT id INTO preserves_id FROM public.categories WHERE slug = 'preserves' LIMIT 1;

        IF curry_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible)
            VALUES ('Curry Powders', 'category', curry_id, 0, TRUE);
        END IF;

        IF spices_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible)
            VALUES ('Spices', 'category', spices_id, 1, TRUE);
        END IF;

        IF snacks_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible)
            VALUES ('Snacks', 'category', snacks_id, 2, TRUE);
        END IF;

        IF preserves_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible)
            VALUES ('Preserves', 'category', preserves_id, 3, TRUE);
        END IF;

        INSERT INTO public.menu_items (label, link_type, custom_url, sort_order, is_visible)
        VALUES ('All Products', 'custom_url', '/', 4, TRUE);
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
