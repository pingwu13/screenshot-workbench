-- Migration 014: AI chat sessions and messages persistence

-- Sessions table
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique: one general session per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_chat_sessions_unique_general
ON public.ai_chat_sessions(user_id) WHERE card_id IS NULL;

-- Unique: one session per user per card
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_chat_sessions_unique_card
ON public.ai_chat_sessions(user_id, card_id) WHERE card_id IS NOT NULL;

-- Messages table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_time
ON public.ai_chat_messages(session_id, created_at ASC);

-- RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Session policies
CREATE POLICY "Users can read own sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.ai_chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.ai_chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Message policies
CREATE POLICY "Users can read own messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.ai_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
