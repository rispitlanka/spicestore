-- Migration: 20260725000002_add_default_country_id_to_customer_profiles.sql
-- Description: Add default_country_id column to customer_profiles referencing public.countries(id)

ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS default_country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.customer_profiles.default_country_id IS 'Default preferred shipping country ID for customer prefill.';
