-- Add alias_songo column to profiles
-- This is the player's Songo-specific display name (e.g. "Vivi le Champion")

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alias_songo TEXT DEFAULT NULL;
