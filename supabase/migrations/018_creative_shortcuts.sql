-- Migration 018: Creative shortcuts

CREATE TABLE IF NOT EXISTS public.creative_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'website' CHECK (type IN ('website', 'software', 'tool', 'document', 'other')),
  url TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_shortcuts_user
ON public.creative_shortcuts(user_id, sort_order);

ALTER TABLE public.creative_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own shortcuts"
ON public.creative_shortcuts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shortcuts"
ON public.creative_shortcuts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shortcuts"
ON public.creative_shortcuts FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shortcuts"
ON public.creative_shortcuts FOR DELETE TO authenticated
USING (auth.uid() = user_id);
