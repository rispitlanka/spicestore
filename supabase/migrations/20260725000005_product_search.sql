-- ============================================================================
-- Migration Name: 20260725000005_product_search.sql
-- Description: Full-text search and trigram similarity setup for products search.
-- ============================================================================

-- 1. Full-text search tsvector column & GIN index on products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))) STORED;

CREATE INDEX IF NOT EXISTS products_search_idx ON public.products USING GIN (search_vector);

-- 2. Trigram similarity extension and index on product name
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING GIN (name gin_trgm_ops);

-- 3. RPC function search_products
CREATE OR REPLACE FUNCTION public.search_products(p_query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  base_price NUMERIC,
  base_weight_kg NUMERIC,
  has_variations BOOLEAN,
  is_active BOOLEAN,
  category_id UUID,
  category_name TEXT,
  category_slug TEXT,
  min_price NUMERIC,
  max_price NUMERIC,
  total_stock INT,
  is_out_of_stock BOOLEAN,
  image_url TEXT,
  rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_query TEXT;
  v_tsquery tsquery;
  v_count INT;
BEGIN
  v_clean_query := trim(coalesce(p_query, ''));
  IF v_clean_query = '' THEN
    RETURN;
  END IF;

  -- Prepare websearch / plain tsquery
  BEGIN
    v_tsquery := websearch_to_tsquery('english', v_clean_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := plainto_tsquery('english', v_clean_query);
  END;

  -- First check if full-text search returns results
  IF v_tsquery IS NOT NULL AND v_tsquery::text != '' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      p.base_price,
      p.base_weight_kg,
      p.has_variations,
      p.is_active,
      p.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      COALESCE(var_stats.min_price, p.base_price, 0) AS min_price,
      COALESCE(var_stats.max_price, p.base_price, 0) AS max_price,
      COALESCE(var_stats.tot_stock, 0)::INT AS total_stock,
      (
        NOT p.is_active OR 
        (p.has_variations AND COALESCE(var_stats.tot_stock, 0) <= 0)
      ) AS is_out_of_stock,
      img.url AS image_url,
      ts_rank(p.search_vector, v_tsquery)::REAL AS rank
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT 
        MIN(v.price) AS min_price,
        MAX(v.price) AS max_price,
        SUM(v.stock) AS tot_stock
      FROM public.product_variations v
      WHERE v.product_id = p.id AND v.is_active = true
    ) var_stats ON true
    LEFT JOIN LATERAL (
      SELECT i.url
      FROM public.product_images i
      WHERE i.product_id = p.id
      ORDER BY i.is_main DESC, i.sort_order ASC
      LIMIT 1
    ) img ON true
    WHERE p.is_active = true
      AND (p.search_vector @@ v_tsquery OR c.name ILIKE '%' || v_clean_query || '%')
    ORDER BY rank DESC, p.created_at DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RETURN;
    END IF;
  END IF;

  -- Fallback to trigram similarity on name or ILIKE match if full text returns no results
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    p.base_price,
    p.base_weight_kg,
    p.has_variations,
    p.is_active,
    p.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    COALESCE(var_stats.min_price, p.base_price, 0) AS min_price,
    COALESCE(var_stats.max_price, p.base_price, 0) AS max_price,
    COALESCE(var_stats.tot_stock, 0)::INT AS total_stock,
    (
      NOT p.is_active OR 
      (p.has_variations AND COALESCE(var_stats.tot_stock, 0) <= 0)
    ) AS is_out_of_stock,
    img.url AS image_url,
    similarity(p.name, v_clean_query)::REAL AS rank
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT 
      MIN(v.price) AS min_price,
      MAX(v.price) AS max_price,
      SUM(v.stock) AS tot_stock
    FROM public.product_variations v
    WHERE v.product_id = p.id AND v.is_active = true
  ) var_stats ON true
  LEFT JOIN LATERAL (
    SELECT i.url
    FROM public.product_images i
    WHERE i.product_id = p.id
    ORDER BY i.is_main DESC, i.sort_order ASC
    LIMIT 1
  ) img ON true
  WHERE p.is_active = true
    AND (
      similarity(p.name, v_clean_query) > 0.2
      OR p.name ILIKE '%' || v_clean_query || '%'
      OR c.name ILIKE '%' || v_clean_query || '%'
    )
  ORDER BY rank DESC, p.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.search_products(TEXT) IS 'Performs full-text search with ts_rank and trigram similarity fallback on active products.';

GRANT EXECUTE ON FUNCTION public.search_products(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_products(TEXT) TO anon;

NOTIFY pgrst, 'reload schema';
