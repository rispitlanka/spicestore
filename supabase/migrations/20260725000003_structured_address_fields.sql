-- ============================================================================
-- Migration Name: 20260725000003_structured_address_fields.sql
-- Description: Replace single freeform delivery address text columns with
--              structured address fields across orders and customer_profiles.
-- ============================================================================

-- 1. ADD STRUCTURED ADDRESS FIELDS TO ORDERS TABLE
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS postal_code text;

-- Preserve existing data: copy shipping_address into address_line1 and set default city
UPDATE public.orders
SET 
  address_line1 = COALESCE(shipping_address, 'N/A'),
  city = 'N/A'
WHERE address_line1 IS NULL OR address_line1 = '';

-- Apply NOT NULL constraints for required fields
ALTER TABLE public.orders
  ALTER COLUMN address_line1 SET NOT NULL,
  ALTER COLUMN city SET NOT NULL;

-- Drop legacy shipping_address column
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS shipping_address;


-- 2. ADD STRUCTURED ADDRESS FIELDS TO CUSTOMER_PROFILES TABLE
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS default_address_line1 text,
  ADD COLUMN IF NOT EXISTS default_address_line2 text,
  ADD COLUMN IF NOT EXISTS default_city text,
  ADD COLUMN IF NOT EXISTS default_district text,
  ADD COLUMN IF NOT EXISTS default_postal_code text;

-- Preserve existing data: copy default_address into default_address_line1
UPDATE public.customer_profiles
SET default_address_line1 = default_address
WHERE default_address IS NOT NULL AND (default_address_line1 IS NULL OR default_address_line1 = '');

-- Drop legacy default_address column
ALTER TABLE public.customer_profiles
  DROP COLUMN IF EXISTS default_address;


-- 3. RE-CREATE CUSTOMER_ORDER_STATS VIEW WITH STRUCTURED FIELDS
CREATE OR REPLACE VIEW public.customer_order_stats AS
SELECT 
    cp.id AS customer_id,
    cp.full_name,
    cp.phone,
    cp.default_address_line1,
    cp.default_address_line2,
    cp.default_city,
    cp.default_district,
    cp.default_postal_code,
    cp.default_country_id,
    cp.created_at AS profile_created_at,
    COALESCE(COUNT(o.id) FILTER (WHERE o.status != 'cancelled'), 0) AS total_orders_count,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status != 'cancelled'), 0.00) AS total_lifetime_spend,
    MAX(o.created_at) AS last_order_date,
    MIN(o.created_at) AS first_order_date
FROM public.customer_profiles cp
LEFT JOIN public.orders o ON o.customer_id = cp.id
GROUP BY cp.id, cp.full_name, cp.phone, cp.default_address_line1, cp.default_address_line2, cp.default_city, cp.default_district, cp.default_postal_code, cp.default_country_id, cp.created_at;

COMMENT ON VIEW public.customer_order_stats IS 'Aggregated order metrics per registered customer profile with structured address fields.';

-- 4. RE-CREATE GUEST_CUSTOMER_STATS VIEW WITH STRUCTURED FIELDS
CREATE OR REPLACE VIEW public.guest_customer_stats AS
SELECT 
    LOWER(TRIM(o.guest_email)) AS guest_email,
    (ARRAY_AGG(o.guest_name ORDER BY o.created_at DESC) FILTER (WHERE o.guest_name IS NOT NULL AND o.guest_name != ''))[1] AS guest_name,
    (ARRAY_AGG(o.guest_phone ORDER BY o.created_at DESC) FILTER (WHERE o.guest_phone IS NOT NULL AND o.guest_phone != ''))[1] AS guest_phone,
    (ARRAY_AGG(o.address_line1 ORDER BY o.created_at DESC) FILTER (WHERE o.address_line1 IS NOT NULL AND o.address_line1 != ''))[1] AS last_address_line1,
    (ARRAY_AGG(o.city ORDER BY o.created_at DESC) FILTER (WHERE o.city IS NOT NULL AND o.city != ''))[1] AS last_city,
    (ARRAY_AGG(o.district ORDER BY o.created_at DESC) FILTER (WHERE o.district IS NOT NULL AND o.district != ''))[1] AS last_district,
    COALESCE(COUNT(o.id) FILTER (WHERE o.status != 'cancelled'), 0) AS total_orders_count,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status != 'cancelled'), 0.00) AS total_lifetime_spend,
    MAX(o.created_at) AS last_order_date,
    MIN(o.created_at) AS first_order_date
FROM public.orders o
WHERE o.customer_id IS NULL AND o.guest_email IS NOT NULL AND TRIM(o.guest_email) != ''
GROUP BY LOWER(TRIM(o.guest_email));

COMMENT ON VIEW public.guest_customer_stats IS 'Aggregated order metrics for guest buyers grouped by guest email.';

-- Grants
GRANT SELECT ON public.customer_order_stats TO authenticated;
GRANT SELECT ON public.guest_customer_stats TO authenticated;
GRANT SELECT ON public.customer_order_stats TO anon;
GRANT SELECT ON public.guest_customer_stats TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
