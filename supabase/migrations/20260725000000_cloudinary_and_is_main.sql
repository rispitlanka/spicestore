-- Migration Name: 20260725000000_cloudinary_and_is_main.sql
-- Description: Adds is_main boolean and cloudinary_public_id text columns to product_images table,
--              enforces at most one main image per product/variation, and backfills main image flag.

-- 1. Add columns to product_images table
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

COMMENT ON COLUMN public.product_images.is_main IS 'Indicates if this image is the primary thumbnail for the product or variation.';
COMMENT ON COLUMN public.product_images.cloudinary_public_id IS 'Cloudinary public_id used for Cloudinary transformations and API deletion.';

-- 2. Partial unique indexes to ensure at most one main image per product (when variation_id is NULL)
-- and at most one main image per variation (when variation_id is NOT NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_main_product
  ON public.product_images(product_id)
  WHERE is_main = TRUE AND variation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_main_variation
  ON public.product_images(variation_id)
  WHERE is_main = TRUE AND variation_id IS NOT NULL;

-- 3. Backfill: Set is_main = TRUE for the image with lowest sort_order for each product/variation if no main image exists
WITH RankedProductImages AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY product_id, COALESCE(variation_id, '00000000-0000-0000-0000-000000000000'::uuid)
           ORDER BY sort_order ASC, id ASC
         ) as row_num
  FROM public.product_images
)
UPDATE public.product_images
SET is_main = TRUE
WHERE id IN (
  SELECT id FROM RankedProductImages WHERE row_num = 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.product_images pi2
  WHERE pi2.product_id = public.product_images.product_id
    AND COALESCE(pi2.variation_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(public.product_images.variation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND pi2.is_main = TRUE
);
