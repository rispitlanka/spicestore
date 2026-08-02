-- ============================================================================
-- Migration: 20260802000001_add_shipping_info_and_storage_tips_to_products.sql
-- Description: Add shipping_info and storage_tips text columns to products table
-- ============================================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS shipping_info text,
ADD COLUMN IF NOT EXISTS storage_tips text;

COMMENT ON COLUMN public.products.shipping_info IS 'Freeform plain text custom shipping information for the product.';
COMMENT ON COLUMN public.products.storage_tips IS 'Freeform plain text custom storage tips for the product.';

-- Seed starter storage tips for common sample items
UPDATE public.products
SET storage_tips = 'Store in an airtight container in a cool, dry place. Protect from direct heat and moisture to retain freshness and aroma.'
WHERE slug = 'jaffna-roasted-curry-powder';

UPDATE public.products
SET storage_tips = 'Store in a cool, dry place in an airtight container to preserve crispness. Keep away from direct sunlight.'
WHERE slug = 'crunchy-roasted-murukku';

UPDATE public.products
SET storage_tips = 'Store at room temperature in a cool, dry place away from direct sunlight. Product may solidify at cooler temperatures.'
WHERE slug = 'organic-virgin-coconut-oil';
