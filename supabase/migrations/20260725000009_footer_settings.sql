-- ============================================================================
-- Migration Name: 20260725000009_footer_settings.sql
-- Description: Seeds initial footer settings rows into settings table.
-- ============================================================================

INSERT INTO public.settings (key, value)
VALUES
    ('footer_about', '{"logo_url": "", "tagline": "Authentic Jaffna Spices & Regional Specialties", "description": "Handcrafted traditional spice blends, curry powders, and authentic Jaffna delicacies delivered worldwide directly from Sri Lanka."}'::jsonb),
    ('footer_contact', '{"email": "info@yarlsamayal.com", "phone": "+94 77 123 4567", "whatsapp": "+94 77 123 4567", "address": "Main Street, Jaffna, Sri Lanka"}'::jsonb),
    ('footer_social', '{"facebook": "", "instagram": "", "tiktok": "", "youtube": ""}'::jsonb),
    ('footer_copyright', '{"text": "© {year} Yarl Samayal. All rights reserved."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
