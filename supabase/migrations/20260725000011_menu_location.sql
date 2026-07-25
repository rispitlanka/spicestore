-- ============================================================================
-- Migration Name: 20260725000011_menu_location.sql
-- Description: Adds menu_location column to menu_items table and seeds footer_shop items.
-- ============================================================================

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS menu_location TEXT NOT NULL DEFAULT 'header'
CHECK (menu_location IN ('header', 'footer_shop'));

COMMENT ON COLUMN public.menu_items.menu_location IS 'Location identifier for menu item (header vs footer_shop).';

-- Seed initial footer_shop rows if no footer_shop items exist
DO $$
DECLARE
    curry_id UUID;
    spices_id UUID;
    snacks_id UUID;
    preserves_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_location = 'footer_shop') THEN
        SELECT id INTO curry_id FROM public.categories WHERE slug = 'curry-powders' LIMIT 1;
        SELECT id INTO spices_id FROM public.categories WHERE slug = 'spices' LIMIT 1;
        SELECT id INTO snacks_id FROM public.categories WHERE slug = 'snacks' LIMIT 1;
        SELECT id INTO preserves_id FROM public.categories WHERE slug = 'preserves' LIMIT 1;

        IF curry_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible, menu_location)
            VALUES ('Curry Powders', 'category', curry_id, 0, TRUE, 'footer_shop');
        END IF;

        IF spices_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible, menu_location)
            VALUES ('Spices & Seasoning', 'category', spices_id, 1, TRUE, 'footer_shop');
        END IF;

        IF snacks_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible, menu_location)
            VALUES ('Authentic Snacks', 'category', snacks_id, 2, TRUE, 'footer_shop');
        END IF;

        IF preserves_id IS NOT NULL THEN
            INSERT INTO public.menu_items (label, link_type, category_id, sort_order, is_visible, menu_location)
            VALUES ('Preserves & Chutneys', 'category', preserves_id, 3, TRUE, 'footer_shop');
        END IF;

        INSERT INTO public.menu_items (label, link_type, custom_url, sort_order, is_visible, menu_location)
        VALUES ('All Products', 'custom_url', '/', 4, TRUE, 'footer_shop');
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
