-- ============================================
-- BOARD SKINS SYSTEM
-- Migration 004: Add board skin customization
-- ============================================

-- Table for available board skins
CREATE TABLE IF NOT EXISTS board_skins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT NOT NULL,
  price INTEGER DEFAULT 0, -- 0 = free, >0 = price in points
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
CREATE POLICY "Board skins are viewable by everyone"
  ON board_skins FOR SELECT
  USING (is_active = true);

-- Users can view their own unlocked skins
CREATE POLICY "Users can view their own unlocked skins"
  ON user_board_skins FOR SELECT
  USING (auth.uid() = user_id);

-- Users can unlock skins (handled by server-side function)
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

-- Get the classic wood skin ID
DO $$
DECLARE
  classic_skin_id UUID;
BEGIN
  SELECT id INTO classic_skin_id FROM board_skins WHERE name = 'Classic Wood';

  -- Grant classic skin to all existing users
  INSERT INTO user_board_skins (user_id, skin_id)
  SELECT id, classic_skin_id FROM profiles
  ON CONFLICT DO NOTHING;

  -- Set classic as default for users without a selected skin
  UPDATE profiles
  SET selected_board_skin = classic_skin_id
  WHERE selected_board_skin IS NULL;
END $$;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to unlock a skin for a user
CREATE OR REPLACE FUNCTION unlock_board_skin(
  p_user_id UUID,
  p_skin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_skin_price INTEGER;
  v_user_points INTEGER;
BEGIN
  -- Get skin price
  SELECT price INTO v_skin_price
  FROM board_skins
  WHERE id = p_skin_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skin not found or inactive';
  END IF;

  -- Check if already unlocked
  IF EXISTS (
    SELECT 1 FROM user_board_skins
    WHERE user_id = p_user_id AND skin_id = p_skin_id
  ) THEN
    RETURN true; -- Already unlocked
  END IF;

  -- TODO: Check user points and deduct if needed
  -- For now, just unlock it

  -- Unlock the skin
  INSERT INTO user_board_skins (user_id, skin_id)
  VALUES (p_user_id, p_skin_id);

  RETURN true;
END;
$$;

-- Function to select a board skin
CREATE OR REPLACE FUNCTION select_board_skin(
  p_user_id UUID,
  p_skin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has unlocked this skin
  IF NOT EXISTS (
    SELECT 1 FROM user_board_skins
    WHERE user_id = p_user_id AND skin_id = p_skin_id
  ) THEN
    RAISE EXCEPTION 'Skin not unlocked';
  END IF;

  -- Update selected skin
  UPDATE profiles
  SET selected_board_skin = p_skin_id
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- ============================================
-- TRIGGER for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_board_skins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER board_skins_updated_at
  BEFORE UPDATE ON board_skins
  FOR EACH ROW
  EXECUTE FUNCTION update_board_skins_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE board_skins IS 'Available board skin themes for the game';
COMMENT ON TABLE user_board_skins IS 'Board skins unlocked by users';
COMMENT ON COLUMN profiles.selected_board_skin IS 'Currently selected board skin for the user';
