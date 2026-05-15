-- Migration 005: Personal signature fields

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_text TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS signature_font TEXT NOT NULL DEFAULT 'sans',
ADD COLUMN IF NOT EXISTS signature_bold BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_italic BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_language TEXT NOT NULL DEFAULT 'auto';
