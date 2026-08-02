-- ============================================================================
-- Migration: 20260802000000_add_ingredients_to_products.sql
-- Description: Add ingredients text column to products table
-- ============================================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS ingredients text;

COMMENT ON COLUMN public.products.ingredients IS 'Freeform plain text list of ingredients and allergen information for the product.';

-- Optional seed sample ingredients for common items
UPDATE public.products
SET ingredients = 'Roasted chili, coriander, cumin, fennel, fenugreek, black pepper, turmeric, cardamom, cloves, cinnamon, curry leaves.'
WHERE slug = 'jaffna-roasted-curry-powder';

UPDATE public.products
SET ingredients = 'Rice flour, urad dal flour, butter, cumin, sesame seeds, salt, refined vegetable oil.'
WHERE slug = 'crunchy-roasted-murukku';

UPDATE public.products
SET ingredients = '100% Pure Organic Cold-Pressed Virgin Coconut Oil.'
WHERE slug = 'organic-virgin-coconut-oil';
