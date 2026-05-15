-- Migration 011: Rename label to category for semantic clarity

ALTER TABLE public.cards RENAME COLUMN label TO category;
