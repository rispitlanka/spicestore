-- ============================================================================
-- Migration Name: 20260725000012_site_identity.sql
-- Description: Seeds initial site_identity setting row into settings table.
-- ============================================================================

INSERT INTO public.settings (key, value)
VALUES
    ('site_identity', '{"logo_url": "", "favicon_url": "", "site_title": "Yarl Samayal", "site_tagline": "Authentic Jaffna Spices & Snacks", "meta_description": "Authentic Jaffna spice blends, savory snacks, and traditional Sri Lankan delicacies."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
