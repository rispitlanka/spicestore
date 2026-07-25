-- ============================================================================
-- Migration Name: 20260725000006_site_settings.sql
-- Description: Creates key-value settings table, seeds initial settings,
--              adds order_number column with sequence & trigger, and updates
--              admin dashboard metrics RPC.
-- ============================================================================

-- 1. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.settings IS 'Site-wide configuration settings stored as key-value JSONB pairs.';

-- 2. Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read settings" ON public.settings;
CREATE POLICY "Public read settings"
    ON public.settings FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin write settings" ON public.settings;
CREATE POLICY "Admin write settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- 3. Seed Initial Settings
INSERT INTO public.settings (key, value)
VALUES
    ('low_stock_threshold', '{"value": 5}'::jsonb),
    ('store_currency', '{"code": "USD", "symbol": "$"}'::jsonb),
    ('order_number_prefix', '{"value": "YS"}'::jsonb),
    ('store_contact_email', '{"value": ""}'::jsonb),
    ('store_contact_phone', '{"value": ""}'::jsonb),
    ('default_shipping_note', '{"value": "Cash on Delivery • Ships internationally"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Add order_number column to orders table and set up sequence & trigger
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_seq BIGINT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    SELECT COALESCE(value->>'value', 'YS') INTO v_prefix
    FROM public.settings
    WHERE key = 'order_number_prefix';

    IF v_prefix IS NULL OR v_prefix = '' THEN
      v_prefix := 'YS';
    END IF;

    v_seq := nextval('public.order_number_seq');
    NEW.order_number := v_prefix || '-' || LPAD(v_seq::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Backfill any existing orders missing an order_number
DO $$
DECLARE
  r RECORD;
  v_prefix TEXT;
  v_seq BIGINT;
BEGIN
  SELECT COALESCE(value->>'value', 'YS') INTO v_prefix
  FROM public.settings
  WHERE key = 'order_number_prefix';

  IF v_prefix IS NULL OR v_prefix = '' THEN
    v_prefix := 'YS';
  END IF;

  FOR r IN SELECT id FROM public.orders WHERE order_number IS NULL OR order_number = '' ORDER BY created_at ASC LOOP
    v_seq := nextval('public.order_number_seq');
    UPDATE public.orders
    SET order_number = v_prefix || '-' || LPAD(v_seq::text, 5, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 5. Update RPC function get_admin_dashboard_metrics to read low_stock_threshold from settings if not passed
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(p_low_stock_threshold INT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold INT;
  v_new_orders_today INT;
  v_revenue_today NUMERIC(12,2);
  v_pending_orders INT;
  v_low_stock_count INT;
  v_trend JSON;
BEGIN
  IF p_low_stock_threshold IS NULL THEN
    SELECT COALESCE((value->>'value')::INT, 5) INTO v_threshold
    FROM public.settings
    WHERE key = 'low_stock_threshold';
    
    IF v_threshold IS NULL THEN
      v_threshold := 5;
    END IF;
  ELSE
    v_threshold := p_low_stock_threshold;
  END IF;

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

  -- 4. Low stock items count (product_variations with stock <= v_threshold)
  SELECT COALESCE(COUNT(*), 0) INTO v_low_stock_count
  FROM public.product_variations
  WHERE stock <= v_threshold;

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

COMMENT ON FUNCTION public.get_admin_dashboard_metrics(INT) IS 'Aggregates key admin dashboard stats using configurable low stock threshold from settings.';

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(INT) TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
