-- Migration 015: AI settings per user

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'deepseek',
  base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
  api_key TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  reasoning_enabled BOOLEAN NOT NULL DEFAULT false,
  reasoning_strength TEXT NOT NULL DEFAULT 'medium',
  multi_turn_enabled BOOLEAN NOT NULL DEFAULT true,
  context_message_limit INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_settings_user_id_unique UNIQUE(user_id)
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI settings"
ON public.ai_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI settings"
ON public.ai_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI settings"
ON public.ai_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI settings"
ON public.ai_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);
