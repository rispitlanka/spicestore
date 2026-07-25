-- ============================================================================
-- Migration Name: 20260724000001_atomic_stock_decrement.sql
-- Description: Provides atomic stock decrement RPC functions to eliminate race
--              conditions and guarantee non-negative stock.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decrement_variation_stock(
    p_variation_id UUID,
    p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_rows INT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN TRUE;
    END IF;

    UPDATE public.product_variations
    SET stock = stock - p_quantity
    WHERE id = p_variation_id
      AND stock >= p_quantity;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    RETURN v_updated_rows > 0;
END;
$$;

COMMENT ON FUNCTION public.decrement_variation_stock(UUID, INT) IS 'Atomically decrements variation stock if stock >= quantity. Returns true if successful.';

CREATE OR REPLACE FUNCTION public.decrement_product_stock(
    p_product_id UUID,
    p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_variation_id UUID;
    v_updated_rows INT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN TRUE;
    END IF;

    -- Find first variation associated with product if present
    SELECT id INTO v_variation_id
    FROM public.product_variations
    WHERE product_id = p_product_id
    LIMIT 1;

    IF v_variation_id IS NOT NULL THEN
        UPDATE public.product_variations
        SET stock = stock - p_quantity
        WHERE id = v_variation_id
          AND stock >= p_quantity;

        GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
        RETURN v_updated_rows > 0;
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.decrement_product_stock(UUID, INT) IS 'Atomically decrements default product variation stock if stock >= quantity. Returns true if successful.';
