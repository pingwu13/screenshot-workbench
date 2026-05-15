-- Migration 008: Multiple images and auto-generated image support

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generated_image_url TEXT NOT NULL DEFAULT '';
