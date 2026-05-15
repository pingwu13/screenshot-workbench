-- Migration 009: Add label field to cards for inbox classification

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
