-- ============================================================================
-- Migration Name: 20260725000013_footer_layout_setting.sql
-- Description: Seeds initial footer_layout setting row into settings table.
-- ============================================================================

INSERT INTO public.settings (key, value)
VALUES
    ('footer_layout', '{"columns": [{"content_type": "about", "width_percent": 30}, {"content_type": "shop_menu", "width_percent": 20}, {"content_type": "legal", "width_percent": 20}, {"content_type": "contact", "width_percent": 30}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
