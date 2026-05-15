-- Migration 007: App settings fields in profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS app_background_theme TEXT NOT NULL DEFAULT 'light',
ADD COLUMN IF NOT EXISTS app_font_family TEXT NOT NULL DEFAULT 'yahei',
ADD COLUMN IF NOT EXISTS card_cleanup_days INTEGER NOT NULL DEFAULT 60;
