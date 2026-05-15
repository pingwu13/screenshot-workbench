-- Add image_path column to cards table
-- This stores the Supabase Storage file path for cleanup on card deletion

ALTER TABLE cards ADD COLUMN IF NOT EXISTS image_path TEXT NOT NULL DEFAULT '';
