-- Migration 012: AI fields for idea processing

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS ai_summary TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS ai_plan TEXT NOT NULL DEFAULT '';
