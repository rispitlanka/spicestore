-- ============================================================================
-- Supabase SQL Seed Script
-- Description: Complete SQL seed script to populate categories, products,
--              variations, images, countries, shipping tiers, and coupons.
-- ============================================================================

-- 1. Seed Categories
INSERT INTO public.categories (id, name, slug, is_active)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'Curry Powders', 'curry-powders', TRUE),
    ('c1000000-0000-0000-0000-000000000002', 'Spices', 'spices', TRUE),
    ('c1000000-0000-0000-0000-000000000003', 'Rice & Grains', 'rice-grains', TRUE),
    ('c1000000-0000-0000-0000-000000000004', 'Sweets & Jaggery', 'sweets-jaggery', TRUE),
    ('c1000000-0000-0000-0000-000000000005', 'Snacks', 'snacks', TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 2. Seed Countries
INSERT INTO public.countries (id, name, code, is_active)
VALUES
    ('cnt10000-0000-0000-0000-000000000001', 'Sri Lanka', 'LK', TRUE),
    ('cnt10000-0000-0000-0000-000000000002', 'India', 'IN', TRUE),
    ('cnt10000-0000-0000-0000-000000000003', 'United Kingdom', 'GB', TRUE),
    ('cnt10000-0000-0000-0000-000000000004', 'United States', 'US', TRUE),
    ('cnt10000-0000-0000-0000-000000000005', 'Australia', 'AU', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 3. Seed Shipping Tiers
DELETE FROM public.shipping_tiers;

INSERT INTO public.shipping_tiers (country_id, weight_kg, price)
SELECT id, 0.500, 2.00 FROM public.countries WHERE code = 'LK' UNION ALL
SELECT id, 1.000, 3.50 FROM public.countries WHERE code = 'LK' UNION ALL
SELECT id, 2.000, 6.00 FROM public.countries WHERE code = 'LK' UNION ALL
SELECT id, 5.000, 12.00 FROM public.countries WHERE code = 'LK' UNION ALL
SELECT id, 0.500, 4.00 FROM public.countries WHERE code = 'IN' UNION ALL
SELECT id, 1.000, 7.00 FROM public.countries WHERE code = 'IN' UNION ALL
SELECT id, 2.000, 12.00 FROM public.countries WHERE code = 'IN' UNION ALL
SELECT id, 5.000, 25.00 FROM public.countries WHERE code = 'IN' UNION ALL
SELECT id, 0.500, 8.00 FROM public.countries WHERE code = 'GB' UNION ALL
SELECT id, 1.000, 14.00 FROM public.countries WHERE code = 'GB' UNION ALL
SELECT id, 2.000, 24.00 FROM public.countries WHERE code = 'GB' UNION ALL
SELECT id, 5.000, 50.00 FROM public.countries WHERE code = 'GB' UNION ALL
SELECT id, 0.500, 10.00 FROM public.countries WHERE code = 'US' UNION ALL
SELECT id, 1.000, 18.00 FROM public.countries WHERE code = 'US' UNION ALL
SELECT id, 2.000, 32.00 FROM public.countries WHERE code = 'US' UNION ALL
SELECT id, 5.000, 65.00 FROM public.countries WHERE code = 'US' UNION ALL
SELECT id, 0.500, 9.50 FROM public.countries WHERE code = 'AU' UNION ALL
SELECT id, 1.000, 16.50 FROM public.countries WHERE code = 'AU' UNION ALL
SELECT id, 2.000, 29.00 FROM public.countries WHERE code = 'AU' UNION ALL
SELECT id, 5.000, 60.00 FROM public.countries WHERE code = 'AU';

-- 4. Seed Coupons
INSERT INTO public.coupons (code, type, value, min_order_value, usage_limit, usage_count, is_active)
VALUES
    ('WELCOME10', 'percent', 10.00, 20.00, 100, 0, TRUE),
    ('FLAT5', 'fixed', 5.00, 15.00, 50, 0, TRUE),
    ('SPICE20', 'percent', 20.00, 25.00, 150, 0, TRUE),
    ('SAVEMORE', 'fixed', 10.00, 50.00, 200, 0, TRUE)
ON CONFLICT (code) DO UPDATE
SET type = EXCLUDED.type, value = EXCLUDED.value, min_order_value = EXCLUDED.min_order_value, is_active = EXCLUDED.is_active;

-- 5. Seed Products
INSERT INTO public.products (id, name, slug, description, category_id, has_variations, base_price, base_weight_kg, is_active)
VALUES
    ('p1000000-0000-0000-0000-000000000001', 'Jaffna Roasted Curry Powder', 'jaffna-roasted-curry-powder', 'Authentic dark roasted aromatic curry powder blend made with roasted coriander, cumin, fennel, and Ceylon spices.', 'c1000000-0000-0000-0000-000000000001', TRUE, NULL, NULL, TRUE),
    ('p1000000-0000-0000-0000-000000000002', 'Pure Ceylon Red Chilli Powder', 'pure-ceylon-red-chilli-powder', 'Fiery sun-dried Ceylon chilli powder ground to perfection for deep red color and bold spice.', 'c1000000-0000-0000-0000-000000000002', TRUE, NULL, NULL, TRUE),
    ('p1000000-0000-0000-0000-000000000003', 'Premium Organic Turmeric Powder', 'premium-organic-turmeric-powder', '100% natural organic turmeric root powder packed with natural curcumin and vibrant golden color.', 'c1000000-0000-0000-0000-000000000002', FALSE, 3.99, 0.200, TRUE),
    ('p1000000-0000-0000-0000-000000000004', 'Traditional Samba Rice', 'traditional-samba-rice', 'Short-grain traditional fragrant Samba rice, perfect for curries, biryanis, and festive meals.', 'c1000000-0000-0000-0000-000000000003', TRUE, NULL, NULL, TRUE),
    ('p1000000-0000-0000-0000-000000000005', 'Handcrafted Palmyra Jaggery', 'handcrafted-palmyra-jaggery', 'Unrefined natural sweet unworked sweetener harvested from northern palmyra palm trees.', 'c1000000-0000-0000-0000-000000000004', TRUE, NULL, NULL, TRUE),
    ('p1000000-0000-0000-0000-000000000006', 'Cardamom Pods (Whole Green)', 'cardamom-pods-whole-green', 'Hand-picked green cardamom pods full of essential oils and intensely fragrant citrus-herbal aroma.', 'c1000000-0000-0000-0000-000000000002', TRUE, NULL, NULL, TRUE),
    ('p1000000-0000-0000-0000-000000000007', 'Crunchy Roasted Murukku', 'crunchy-roasted-murukku', 'Traditional savory rice flour snack seasoned with cumin and sesame seeds for ultimate crunch.', 'c1000000-0000-0000-0000-000000000005', FALSE, 2.99, 0.250, TRUE),
    ('p1000000-0000-0000-0000-000000000008', 'Organic Virgin Coconut Oil', 'organic-virgin-coconut-oil', 'Cold-pressed 100% pure unrefined virgin coconut oil from fresh coconuts.', 'c1000000-0000-0000-0000-000000000002', FALSE, 7.99, 0.500, TRUE),
    ('p1000000-0000-0000-0000-000000000009', 'Sun-Dried Curry Leaves', 'sun-dried-curry-leaves', 'Freshly harvested sun-dried aromatic curry leaves ideal for tempering oil and seasoning dishes.', 'c1000000-0000-0000-0000-000000000002', FALSE, 1.99, 0.050, TRUE),
    ('p1000000-0000-0000-0000-000000000010', 'Ceylon True Cinnamon Sticks', 'ceylon-true-cinnamon-sticks', 'Premium grade Alba Ceylon cinnamon quills with delicate warm sweet flavor profile.', 'c1000000-0000-0000-0000-000000000002', FALSE, 6.49, 0.100, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, category_id = EXCLUDED.category_id, has_variations = EXCLUDED.has_variations, base_price = EXCLUDED.base_price, base_weight_kg = EXCLUDED.base_weight_kg, is_active = EXCLUDED.is_active;

-- 6. Seed Product Variations
INSERT INTO public.product_variations (id, product_id, attributes, sku, price, weight_kg, stock, is_active)
VALUES
    ('v1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', '{"weight": "250g"}', 'JCP-250G', 4.99, 0.250, 50, TRUE),
    ('v1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000001', '{"weight": "500g"}', 'JCP-500G', 8.99, 0.500, 30, TRUE),
    ('v1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000001', '{"weight": "1kg"}', 'JCP-1KG', 16.99, 1.000, 15, TRUE),
    ('v1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000002', '{"weight": "100g"}', 'RCP-100G', 2.50, 0.100, 40, TRUE),
    ('v1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000002', '{"weight": "250g"}', 'RCP-250G', 5.50, 0.250, 25, TRUE),
    ('v1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000002', '{"weight": "500g"}', 'RCP-500G', 9.99, 0.500, 10, TRUE),
    ('v1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000003', '{"weight": "Standard"}', 'TUR-200G', 3.99, 0.200, 60, TRUE),
    ('v1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000004', '{"weight": "1kg"}', 'SAMBA-1KG', 3.49, 1.000, 100, TRUE),
    ('v1000000-0000-0000-0000-000000000009', 'p1000000-0000-0000-0000-000000000004', '{"weight": "5kg"}', 'SAMBA-5KG', 15.99, 5.000, 40, TRUE),
    ('v1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000004', '{"weight": "10kg"}', 'SAMBA-10KG', 29.99, 10.000, 20, TRUE),
    ('v1000000-0000-0000-0000-000000000011', 'p1000000-0000-0000-0000-000000000005', '{"weight": "250g"}', 'JAG-250G', 4.50, 0.250, 35, TRUE),
    ('v1000000-0000-0000-0000-000000000012', 'p1000000-0000-0000-0000-000000000005', '{"weight": "500g"}', 'JAG-500G', 8.50, 0.500, 20, TRUE),
    ('v1000000-0000-0000-0000-000000000013', 'p1000000-0000-0000-0000-000000000006', '{"weight": "50g"}', 'CARD-50G', 5.99, 0.050, 50, TRUE),
    ('v1000000-0000-0000-0000-000000000014', 'p1000000-0000-0000-0000-000000000006', '{"weight": "100g"}', 'CARD-100G', 10.99, 0.100, 25, TRUE),
    ('v1000000-0000-0000-0000-000000000015', 'p1000000-0000-0000-0000-000000000007', '{"weight": "Standard"}', 'MUR-250G', 2.99, 0.250, 45, TRUE),
    ('v1000000-0000-0000-0000-000000000016', 'p1000000-0000-0000-0000-000000000008', '{"weight": "Standard"}', 'VCO-500ML', 7.99, 0.500, 30, TRUE),
    ('v1000000-0000-0000-0000-000000000017', 'p1000000-0000-0000-0000-000000000009', '{"weight": "Standard"}', 'CLEAF-50G', 1.99, 0.050, 80, TRUE),
    ('v1000000-0000-0000-0000-000000000018', 'p1000000-0000-0000-0000-000000000010', '{"weight": "Standard"}', 'CIN-100G', 6.49, 0.100, 20, TRUE)
ON CONFLICT (sku) DO UPDATE
SET price = EXCLUDED.price, weight_kg = EXCLUDED.weight_kg, stock = EXCLUDED.stock, is_active = EXCLUDED.is_active;

-- 7. Seed Product Images
DELETE FROM public.product_images;

INSERT INTO public.product_images (product_id, url, sort_order)
VALUES
    ('p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80', 0),
    ('p1000000-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1509358271058-acd01cc9386a?w=800&auto=format&fit=crop&q=80', 0);
