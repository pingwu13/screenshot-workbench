-- Migration 010: Card categories system

CREATE TABLE IF NOT EXISTS public.card_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT card_categories_user_name_unique UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_card_categories_user_order
ON public.card_categories(user_id, sort_order ASC);

ALTER TABLE public.card_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own card categories"
ON public.card_categories FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card categories"
ON public.card_categories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card categories"
ON public.card_categories FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card categories"
ON public.card_categories FOR DELETE TO authenticated
USING (auth.uid() = user_id);
