-- Migration 006: Daily check-in system

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  quote_id TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  quote_category TEXT NOT NULL,
  quote_source TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_checkins_user_date_unique UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
ON public.daily_checkins(user_id, checkin_date DESC);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkins"
ON public.daily_checkins FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
ON public.daily_checkins FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
