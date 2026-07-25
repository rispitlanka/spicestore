-- ============================================================================
-- Create Storage Bucket for Product Images and Configure Policies
-- Migration Name: 20260724000000_create_product_images_bucket.sql
-- ============================================================================

-- Create public storage bucket 'product-images' if not already created
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Anyone (public) can read/view product images
CREATE POLICY "Public Read Product Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- RLS Policy: Authenticated admin users can upload product images
CREATE POLICY "Admin Upload Product Images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- RLS Policy: Authenticated admin users can update product images
CREATE POLICY "Admin Update Product Images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- RLS Policy: Authenticated admin users can delete product images
CREATE POLICY "Admin Delete Product Images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());
