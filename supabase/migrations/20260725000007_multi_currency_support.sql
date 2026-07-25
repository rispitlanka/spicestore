-- ============================================================================
-- Migration Name: 20260725000007_multi_currency_support.sql
-- Description: Creates exchange_rates table, adds base currency and rate freezing
--              columns to orders table, seeds initial exchange rates and multi-currency
--              settings.
-- ============================================================================

-- 1. Create Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    currency_code TEXT PRIMARY KEY,
    rate_to_base NUMERIC(12, 6) NOT NULL, -- 1 unit of base currency = rate_to_base units of currency_code
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.exchange_rates IS 'Stores currency exchange rates relative to the store base currency.';

-- 2. Row Level Security (RLS) on exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read exchange_rates" ON public.exchange_rates;
CREATE POLICY "Public read exchange_rates"
    ON public.exchange_rates FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin write exchange_rates" ON public.exchange_rates;
CREATE POLICY "Admin write exchange_rates"
    ON public.exchange_rates FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- 3. Seed Initial Exchange Rates (Base Currency = USD)
INSERT INTO public.exchange_rates (currency_code, rate_to_base, updated_at)
VALUES
    ('USD', 1.000000, NOW()),
    ('LKR', 300.000000, NOW()),
    ('GBP', 0.780000, NOW()),
    ('EUR', 0.920000, NOW()),
    ('AUD', 1.520000, NOW()),
    ('CAD', 1.380000, NOW()),
    ('INR', 83.500000, NOW())
ON CONFLICT (currency_code) DO NOTHING;

-- 4. Add Multi-Currency Columns to Orders Table for Rate Freezing at Checkout
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal_base NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost_base NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount_base NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS display_currency_code TEXT DEFAULT 'USD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(12, 6) DEFAULT 1.000000;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount_display NUMERIC(12, 2);

COMMENT ON COLUMN public.orders.display_currency_code IS 'Currency code displayed to customer at checkout. FROZEN at order placement.';
COMMENT ON COLUMN public.orders.exchange_rate_used IS 'Rate to base currency at checkout. FROZEN at order placement for COD collection accuracy.';
COMMENT ON COLUMN public.orders.total_amount_display IS 'Total amount calculated in display currency (total_amount_base * exchange_rate_used). FROZEN at order placement.';

-- Backfill existing orders
UPDATE public.orders
SET
    subtotal_base = COALESCE(subtotal_base, subtotal),
    shipping_cost_base = COALESCE(shipping_cost_base, shipping_cost),
    total_amount_base = COALESCE(total_amount_base, total_amount),
    display_currency_code = COALESCE(display_currency_code, 'USD'),
    exchange_rate_used = COALESCE(exchange_rate_used, 1.000000),
    total_amount_display = COALESCE(total_amount_display, total_amount)
WHERE total_amount_base IS NULL;

-- 5. Seed Multi-Currency Settings into Settings Table
INSERT INTO public.settings (key, value)
VALUES
    ('auto_currency_detection_enabled', '{"value": true}'::jsonb),
    ('supported_currencies', '["USD", "LKR", "GBP", "EUR", "AUD", "CAD", "INR"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
