-- ============================================================================
-- Supabase E-Commerce Schema Migration
-- Migration Name: 20260723000000_create_ecommerce_schema.sql
-- Description: Sets up tables, constraints, indexes, RLS policies, and triggers
--              for an e-commerce platform with product variations, coupons,
--              orders, customer profiles, and shipping tiers.
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE & HELPER FUNCTION
-- ----------------------------------------------------------------------------
-- Admin management choice: Admin Users Table
-- Rationale: Simple, self-contained within database migrations, easily manageable
-- via SQL queries or admin UI without requiring external JWT claim configuration 
-- or auth service hooks.
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_users IS 'Identifies authenticated users with admin privileges.';

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if auth.uid() exists in admin_users table.';

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.categories IS 'Product categories with slug and active status flag.';

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    has_variations BOOLEAN NOT NULL DEFAULT FALSE,
    base_price NUMERIC(12, 2),        -- Used only when has_variations = false
    base_weight_kg NUMERIC(8, 3),      -- Used only when has_variations = false
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.products IS 'Stores main product details. base_price/base_weight_kg used when has_variations is false.';

-- ----------------------------------------------------------------------------
-- 4. PRODUCT VARIATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"size":"L", "color":"Red"}
    sku TEXT UNIQUE,
    price NUMERIC(12, 2) NOT NULL,
    weight_kg NUMERIC(8, 3) NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.product_variations IS 'Product variations (SKU, attributes, price, stock) linked to a parent product.';

-- ----------------------------------------------------------------------------
-- 5. PRODUCT IMAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.product_images IS 'Images for products and optional specific variations.';

-- ----------------------------------------------------------------------------
-- 6. CUSTOMER PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    default_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customer_profiles IS 'Customer profile details tied to auth.users.';

-- Trigger to automatically create a customer profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. COUNTRIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.countries IS 'Supported shipping destination countries.';

-- ----------------------------------------------------------------------------
-- 8. SHIPPING TIERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    weight_kg NUMERIC(8, 3) NOT NULL,
    price NUMERIC(12, 2) NOT NULL
);

COMMENT ON TABLE public.shipping_tiers IS 'Weight-based shipping pricing tiers per country.';

-- ----------------------------------------------------------------------------
-- 9. COUPONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
    min_order_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    usage_limit INT,
    usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    per_customer_limit INT,
    applicable_product_ids UUID[],
    applicable_category_ids UUID[],
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.coupons IS 'Discount coupons with percentage or fixed reduction and restriction criteria.';

-- ----------------------------------------------------------------------------
-- 10. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    shipping_address TEXT NOT NULL,
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_weight_kg NUMERIC(8, 3) NOT NULL CHECK (total_weight_kg >= 0),
    shipping_cost NUMERIC(12, 2) NOT NULL CHECK (shipping_cost >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL DEFAULT 'COD',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS 'Customer & guest orders containing shipping address, totals, status, and payment method.';

-- ----------------------------------------------------------------------------
-- 11. COUPON REDEMPTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.coupon_redemptions IS 'Audit record of redeemed coupons per order/customer.';

-- ----------------------------------------------------------------------------
-- 12. ORDER ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_weight_kg NUMERIC(8, 3) NOT NULL CHECK (unit_weight_kg >= 0)
);

COMMENT ON TABLE public.order_items IS 'Line items belonging to an order.';

-- ----------------------------------------------------------------------------
-- 13. INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_product ON public.product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_variation ON public.product_images(variation_id);
CREATE INDEX IF NOT EXISTS idx_shipping_tiers_country ON public.shipping_tiers(country_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_country ON public.orders(country_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon ON public.orders(coupon_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON public.coupon_redemptions(order_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Admin Users Table RLS
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- Public Catalog Tables: categories, products, product_variations, product_images, countries, shipping_tiers, coupons
-- Rules: Public SELECT on active rows; INSERT/UPDATE/DELETE restricted to admins.
-- ----------------------------------------------------------------------------

-- Categories
CREATE POLICY "Public read active categories, admin read all"
    ON public.categories FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admin write categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Products
CREATE POLICY "Public read active products, admin read all"
    ON public.products FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admin write products"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Product Variations
CREATE POLICY "Public read active variations, admin read all"
    ON public.product_variations FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admin write variations"
    ON public.product_variations FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Product Images
CREATE POLICY "Public read images"
    ON public.product_images FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin write images"
    ON public.product_images FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Countries
CREATE POLICY "Public read active countries, admin read all"
    ON public.countries FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admin write countries"
    ON public.countries FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Shipping Tiers
CREATE POLICY "Public read shipping tiers"
    ON public.shipping_tiers FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin write shipping tiers"
    ON public.shipping_tiers FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Coupons
CREATE POLICY "Public read active coupons, admin read all"
    ON public.coupons FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admin write coupons"
    ON public.coupons FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Customer Profiles
-- Rules: User can SELECT/UPDATE only their own row (auth.uid() = id); admins can SELECT all
-- ----------------------------------------------------------------------------
CREATE POLICY "Users view own profile, admins view all"
    ON public.customer_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile, admins update all"
    ON public.customer_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users insert own profile, admins insert all"
    ON public.customer_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- Orders & Order Items
-- Rules: INSERT allowed for anyone (guest or logged-in);
--        SELECT restricted to owning customer (auth.uid() = customer_id) or admin;
--        UPDATE restricted to admin only.
-- ----------------------------------------------------------------------------

-- Orders
CREATE POLICY "Anyone can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Customers view own orders, admins view all"
    ON public.orders FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND customer_id = auth.uid()) 
        OR public.is_admin()
    );

CREATE POLICY "Admin update orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete orders"
    ON public.orders FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Order Items
CREATE POLICY "Anyone can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Customers view own order items, admins view all"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
              AND (
                (auth.uid() IS NOT NULL AND orders.customer_id = auth.uid()) 
                OR public.is_admin()
              )
        )
    );

CREATE POLICY "Admin update order items"
    ON public.order_items FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete order items"
    ON public.order_items FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- Coupon Redemptions
-- Rules: INSERT allowed via order creation; SELECT restricted to admin
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can insert coupon redemptions"
    ON public.coupon_redemptions FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Admin view coupon redemptions"
    ON public.coupon_redemptions FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin update coupon redemptions"
    ON public.coupon_redemptions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete coupon redemptions"
    ON public.coupon_redemptions FOR DELETE
    TO authenticated
    USING (public.is_admin());
