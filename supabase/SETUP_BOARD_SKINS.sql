-- ============================================
-- CONFIGURATION COMPLÈTE DES BOARD SKINS
-- Combine migrations 004 + 005
-- ============================================

-- ============================================
-- MIGRATION 004: Tables et données initiales
-- ============================================

-- Table for available board skins
CREATE TABLE IF NOT EXISTS board_skins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user unlocked skins
CREATE TABLE IF NOT EXISTS user_board_skins (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skin_id UUID REFERENCES board_skins(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, skin_id)
);

-- Add selected board skin to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS selected_board_skin UUID REFERENCES board_skins(id) ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE board_skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_board_skins ENABLE ROW LEVEL SECURITY;

-- Everyone can view active board skins
DROP POLICY IF EXISTS "Board skins are viewable by everyone" ON board_skins;
CREATE POLICY "Board skins are viewable by everyone"
  ON board_skins FOR SELECT
  USING (is_active = true);

-- Users can view their own unlocked skins
DROP POLICY IF EXISTS "Users can view their own unlocked skins" ON user_board_skins;
CREATE POLICY "Users can view their own unlocked skins"
  ON user_board_skins FOR SELECT
  USING (auth.uid() = user_id);

-- Users can unlock skins
DROP POLICY IF EXISTS "Users can unlock skins" ON user_board_skins;
CREATE POLICY "Users can unlock skins"
  ON user_board_skins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_board_skins_user_id ON user_board_skins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_board_skins_skin_id ON user_board_skins(skin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_selected_board_skin ON profiles(selected_board_skin);

-- ============================================
-- INITIAL DATA - Default Board Skins
-- ============================================

-- Insert default free skins
INSERT INTO board_skins (name, description, image_url, price, is_premium, is_active)
VALUES
  ('Classic Wood', 'Le plateau classique en bois chaleureux', '/boards/classic.png', 0, false, true),
  ('Original Dark', 'Le plateau original avec dorures mystiques', '/akong.png', 0, false, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MIGRATION 005: Update trigger + Backfill
-- ============================================

-- Update the handle_new_user function to assign Classic Wood skin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_username TEXT;
  classic_skin_id UUID;
BEGIN
  -- Generate a random username from email (user can change it later)
  random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);

  -- Get the Classic Wood skin ID
  SELECT id INTO classic_skin_id
  FROM board_skins
  WHERE name = 'Classic Wood'
  LIMIT 1;

  -- Insert profile with generated username
  INSERT INTO public.profiles (id, username, display_name, selected_board_skin)
  VALUES (
    NEW.id,
    random_username,
    SPLIT_PART(NEW.email, '@', 1),
    classic_skin_id  -- Set Classic Wood as default
  );

  -- Unlock Classic Wood skin for the new user (if skin exists)
  IF classic_skin_id IS NOT NULL THEN
    INSERT INTO public.user_board_skins (user_id, skin_id)
    VALUES (NEW.id, classic_skin_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username already exists, append more of the UUID
    random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);

    -- Retry with longer username
    INSERT INTO public.profiles (id, username, display_name, selected_board_skin)
    VALUES (NEW.id, random_username, SPLIT_PART(NEW.email, '@', 1), classic_skin_id);

    -- Unlock Classic Wood skin (if skin exists)
    IF classic_skin_id IS NOT NULL THEN
      INSERT INTO public.user_board_skins (user_id, skin_id)
      VALUES (NEW.id, classic_skin_id)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BACKFILL: Assign Classic Wood to existing users
-- ============================================

DO $$
DECLARE
  classic_skin_id UUID;
  affected_users INTEGER;
BEGIN
  -- Get the Classic Wood skin ID
  SELECT id INTO classic_skin_id FROM board_skins WHERE name = 'Classic Wood';

  IF classic_skin_id IS NOT NULL THEN
    -- Unlock Classic Wood for users who don't have it yet
    INSERT INTO user_board_skins (user_id, skin_id)
    SELECT p.id, classic_skin_id
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM user_board_skins ubs
      WHERE ubs.user_id = p.id AND ubs.skin_id = classic_skin_id
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS affected_users = ROW_COUNT;
    RAISE NOTICE 'Unlocked Classic Wood for % existing users', affected_users;

    -- Set Classic Wood as default for users without a selected skin
    UPDATE profiles
    SET selected_board_skin = classic_skin_id
    WHERE selected_board_skin IS NULL;

    GET DIAGNOSTICS affected_users = ROW_COUNT;
    RAISE NOTICE 'Set Classic Wood as default for % users', affected_users;
  ELSE
    RAISE WARNING 'Classic Wood skin not found - skipping backfill';
  END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Board skins configurés avec succès ! Classic Wood est maintenant le skin par défaut.' AS status;
