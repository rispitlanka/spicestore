-- Migration Name: 20260725000001_variation_scoped_main_images.sql
-- Description: Refines product_images main-image uniqueness to be scoped per (product_id, variation_id) pair.
--              Enforces at most one main image at product level (variation_id IS NULL)
--              and at most one main image per specific variation (variation_id IS NOT NULL).

-- 1. Ensure partial unique indexes exist
DROP INDEX IF EXISTS public.idx_product_images_main_product;
DROP INDEX IF EXISTS public.idx_product_images_main_variation;

-- Product-level main image index (where variation_id is NULL)
CREATE UNIQUE INDEX idx_product_images_main_product
  ON public.product_images(product_id)
  WHERE is_main = TRUE AND variation_id IS NULL;

-- Variation-specific main image index (where variation_id is NOT NULL)
CREATE UNIQUE INDEX idx_product_images_main_variation
  ON public.product_images(product_id, variation_id)
  WHERE is_main = TRUE AND variation_id IS NOT NULL;

-- 2. Backfill: Within each (product_id, variation_id) scope, set is_main = TRUE for lowest sort_order image if none exists
WITH ScopeRankedImages AS (
  SELECT id,
         product_id,
         variation_id,
         is_main,
         ROW_NUMBER() OVER (
           PARTITION BY product_id, variation_id
           ORDER BY sort_order ASC, id ASC
         ) as row_num
  FROM public.product_images
)
UPDATE public.product_images pi
SET is_main = TRUE
WHERE pi.id IN (
  SELECT sri.id
  FROM ScopeRankedImages sri
  WHERE sri.row_num = 1
)
AND NOT EXISTS (
  SELECT 1
  FROM public.product_images pi2
  WHERE pi2.product_id = pi.product_id
    AND pi2.variation_id IS NOT DISTINCT FROM pi.variation_id
    AND pi2.is_main = TRUE
);
