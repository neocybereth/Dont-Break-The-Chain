-- Migration: Add frequency column to streaks table
-- Run this in your Supabase SQL Editor if you already have the streaks table

-- Add the frequency column with default value 'daily'
ALTER TABLE streaks 
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily' 
CHECK (frequency IN ('daily', 'weekly'));

-- Update any existing streaks to have 'daily' as their frequency
UPDATE streaks 
SET frequency = 'daily' 
WHERE frequency IS NULL;

