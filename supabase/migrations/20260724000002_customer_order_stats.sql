-- ============================================================================
-- Migration Name: 20260724000002_customer_order_stats.sql
-- Description: Views for server-side aggregation of customer order statistics,
--              total lifetime spend, order counts, and guest buyer grouping.
-- ============================================================================

-- 1. VIEW FOR REGISTERED CUSTOMER ORDER STATS
CREATE OR REPLACE VIEW public.customer_order_stats AS
SELECT 
    cp.id AS customer_id,
    cp.full_name,
    cp.phone,
    cp.default_address,
    cp.created_at AS profile_created_at,
    COALESCE(COUNT(o.id) FILTER (WHERE o.status != 'cancelled'), 0) AS total_orders_count,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status != 'cancelled'), 0.00) AS total_lifetime_spend,
    MAX(o.created_at) AS last_order_date,
    MIN(o.created_at) AS first_order_date
FROM public.customer_profiles cp
LEFT JOIN public.orders o ON o.customer_id = cp.id
GROUP BY cp.id, cp.full_name, cp.phone, cp.default_address, cp.created_at;

COMMENT ON VIEW public.customer_order_stats IS 'Aggregated order metrics per registered customer profile.';

-- 2. VIEW FOR GUEST CUSTOMER ORDER STATS (Grouped by guest_email)
CREATE OR REPLACE VIEW public.guest_customer_stats AS
SELECT 
    LOWER(TRIM(o.guest_email)) AS guest_email,
    (ARRAY_AGG(o.guest_name ORDER BY o.created_at DESC) FILTER (WHERE o.guest_name IS NOT NULL AND o.guest_name != ''))[1] AS guest_name,
    (ARRAY_AGG(o.guest_phone ORDER BY o.created_at DESC) FILTER (WHERE o.guest_phone IS NOT NULL AND o.guest_phone != ''))[1] AS guest_phone,
    (ARRAY_AGG(o.shipping_address ORDER BY o.created_at DESC) FILTER (WHERE o.shipping_address IS NOT NULL AND o.shipping_address != ''))[1] AS last_shipping_address,
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
