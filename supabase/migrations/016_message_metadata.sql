-- Migration 016: Add metadata and timing fields to chat messages

ALTER TABLE public.ai_chat_messages
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
