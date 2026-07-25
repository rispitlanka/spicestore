-- ============================================================================
-- Migration: 20260724000003_add_compare_at_price.sql
-- Description: Add compare_at_price numeric column to products and product_variations
-- ============================================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2);

ALTER TABLE public.product_variations 
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2);

COMMENT ON COLUMN public.products.compare_at_price IS 'Original/list price before discount for single items.';
COMMENT ON COLUMN public.product_variations.compare_at_price IS 'Original/list price before discount for variation SKUs.';

-- Update sample products with compare_at_price for demo sales section
UPDATE public.products
SET compare_at_price = 5.99
WHERE slug = 'jaffna-roasted-curry-powder';

UPDATE public.products
SET compare_at_price = 3.99
WHERE slug = 'crunchy-roasted-murukku';

UPDATE public.products
SET compare_at_price = 9.99
WHERE slug = 'organic-virgin-coconut-oil';

UPDATE public.product_variations
SET compare_at_price = 5.99
WHERE sku = 'JCP-250G';

UPDATE public.product_variations
SET compare_at_price = 3.99
WHERE sku = 'MUR-250G';
