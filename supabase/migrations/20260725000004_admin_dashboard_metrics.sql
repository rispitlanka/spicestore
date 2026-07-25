-- ============================================================================
-- Migration Name: 20260725000004_admin_dashboard_metrics.sql
-- Description: RPC function for server-side aggregate calculation of admin dashboard stats:
--              new orders today, revenue today, pending orders count, low stock count,
--              and 7-day revenue trend.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(p_low_stock_threshold INT DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_orders_today INT;
  v_revenue_today NUMERIC(12,2);
  v_pending_orders INT;
  v_low_stock_count INT;
  v_trend JSON;
BEGIN
  -- 1. New orders placed today with status = 'pending'
  SELECT COALESCE(COUNT(*), 0) INTO v_new_orders_today
  FROM public.orders
  WHERE status = 'pending'
    AND created_at >= date_trunc('day', NOW());

  -- 2. Revenue today (sum of total_amount for non-cancelled orders today)
  SELECT COALESCE(SUM(total_amount), 0.00) INTO v_revenue_today
  FROM public.orders
  WHERE status != 'cancelled'
    AND created_at >= date_trunc('day', NOW());

  -- 3. Pending orders total across all time in 'pending' or 'confirmed' status
  SELECT COALESCE(COUNT(*), 0) INTO v_pending_orders
  FROM public.orders
  WHERE status IN ('pending', 'confirmed');

  -- 4. Low stock items count (product_variations with stock <= p_low_stock_threshold)
  SELECT COALESCE(COUNT(*), 0) INTO v_low_stock_count
  FROM public.product_variations
  WHERE stock <= p_low_stock_threshold;

  -- 5. 7-day revenue trend (including today, non-cancelled orders)
  SELECT json_agg(
    json_build_object(
      'date', d.dt::text,
      'revenue', COALESCE(SUM(o.total_amount), 0.00)
    ) ORDER BY d.dt ASC
  ) INTO v_trend
  FROM (
    SELECT (CURRENT_DATE - (i || ' days')::interval)::date AS dt
    FROM generate_series(6, 0, -1) AS i
  ) d
  LEFT JOIN public.orders o 
    ON o.created_at::date = d.dt 
   AND o.status != 'cancelled'
  GROUP BY d.dt;

  RETURN json_build_object(
    'new_orders_today', v_new_orders_today,
    'revenue_today', v_revenue_today,
    'pending_orders', v_pending_orders,
    'low_stock_count', v_low_stock_count,
    'trend_7days', COALESCE(v_trend, '[]'::json)
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_metrics(INT) IS 'Aggregates key admin dashboard stats and 7-day revenue trend server-side.';

-- Grant execution to authenticated users (admins) and anon
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(INT) TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
