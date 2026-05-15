-- Supabase Database Schema
-- Run this migration in your Supabase SQL editor or via Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE card_type AS ENUM ('learn', 'todo', 'reference', 'idea');
CREATE TYPE card_status AS ENUM ('inbox', 'planned', 'doing', 'done', 'archived');

-- Create cards table
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  type card_type NOT NULL DEFAULT 'reference',
  status card_status NOT NULL DEFAULT 'inbox',
  tags TEXT[] NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  ocr_text TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_type ON cards(type);
CREATE INDEX idx_cards_created_at ON cards(created_at DESC);
CREATE INDEX idx_cards_tags ON cards USING GIN(tags);

-- Full-text search index
CREATE INDEX idx_cards_search ON cards USING GIN(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(ocr_text, ''))
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for screenshots
-- Run these separately in Supabase dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);

-- Row Level Security (RLS)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (personal app)
CREATE POLICY "Allow all for authenticated users" ON cards
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON cards
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
