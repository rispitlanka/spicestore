-- Migration Name: 20260726000001_performance_indexes.sql
-- Description: Adds performance indexes for frequently queried columns across orders, product images, menu items, legal pages, and order email logs.

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_product_images_variation_id ON public.product_images (variation_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_main ON public.product_images (is_main);
CREATE INDEX IF NOT EXISTS idx_menu_items_location ON public.menu_items (menu_location, is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_legal_pages_slug ON public.legal_pages (slug);
CREATE INDEX IF NOT EXISTS idx_order_email_log_order_id ON public.order_email_log (order_id);
