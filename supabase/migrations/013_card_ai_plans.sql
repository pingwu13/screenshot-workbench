-- Migration 013: Individual AI plans for cards

CREATE TABLE IF NOT EXISTS public.card_ai_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_ai_plans_user_card
ON public.card_ai_plans(user_id, card_id, created_at DESC);

ALTER TABLE public.card_ai_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI plans"
ON public.card_ai_plans FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI plans"
ON public.card_ai_plans FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI plans"
ON public.card_ai_plans FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI plans"
ON public.card_ai_plans FOR DELETE TO authenticated
USING (auth.uid() = user_id);
