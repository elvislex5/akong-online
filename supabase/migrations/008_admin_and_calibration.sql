-- ============================================
-- Migration 008: Admin role + Board skin calibration
-- ============================================

-- 1. Add is_admin flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS 'Admin flag - grants access to calibration tool and admin features';

-- 2. Add calibration JSONB column to board_skins
ALTER TABLE board_skins
ADD COLUMN IF NOT EXISTS calibration JSONB DEFAULT NULL;

COMMENT ON COLUMN board_skins.calibration IS 'Calibration data: { pitPositions: {...}, granaryPositions: {...} } in % relative to board image';

-- 3. Seed existing calibration data from hardcoded configs
-- Classic Wood
UPDATE board_skins
SET calibration = '{
  "pitPositions": {
    "0": { "x": 80.5, "y": 71.0, "w": 8.0, "h": 16.0 },
    "1": { "x": 70.4, "y": 71.0, "w": 8.0, "h": 16.0 },
    "2": { "x": 59.9, "y": 71.0, "w": 8.0, "h": 16.0 },
    "3": { "x": 49.6, "y": 71.0, "w": 8.0, "h": 16.0 },
    "4": { "x": 39.2, "y": 71.0, "w": 8.0, "h": 16.0 },
    "5": { "x": 28.8, "y": 71.0, "w": 8.0, "h": 16.0 },
    "6": { "x": 18.7, "y": 71.0, "w": 8.0, "h": 16.0 },
    "7": { "x": 18.5, "y": 26.6, "w": 8.0, "h": 16.0 },
    "8": { "x": 28.7, "y": 26.6, "w": 8.0, "h": 16.0 },
    "9": { "x": 39.3, "y": 26.6, "w": 8.0, "h": 16.0 },
    "10": { "x": 49.6, "y": 26.6, "w": 8.0, "h": 16.0 },
    "11": { "x": 59.9, "y": 26.6, "w": 8.0, "h": 16.0 },
    "12": { "x": 70.5, "y": 26.6, "w": 8.0, "h": 16.0 },
    "13": { "x": 80.7, "y": 26.6, "w": 8.0, "h": 16.0 }
  },
  "granaryPositions": {
    "playerOne": { "x": 26.1, "y": 48.5, "w": 17.0, "h": 15.5 },
    "playerTwo": { "x": 73.4, "y": 48.5, "w": 17.0, "h": 15.5 }
  }
}'::jsonb
WHERE name = 'Classic Wood';

-- Original Dark (same calibration as Classic)
UPDATE board_skins
SET calibration = '{
  "pitPositions": {
    "0": { "x": 80.5, "y": 71.0, "w": 8.0, "h": 16.0 },
    "1": { "x": 70.4, "y": 71.0, "w": 8.0, "h": 16.0 },
    "2": { "x": 59.9, "y": 71.0, "w": 8.0, "h": 16.0 },
    "3": { "x": 49.6, "y": 71.0, "w": 8.0, "h": 16.0 },
    "4": { "x": 39.2, "y": 71.0, "w": 8.0, "h": 16.0 },
    "5": { "x": 28.8, "y": 71.0, "w": 8.0, "h": 16.0 },
    "6": { "x": 18.7, "y": 71.0, "w": 8.0, "h": 16.0 },
    "7": { "x": 18.5, "y": 26.6, "w": 8.0, "h": 16.0 },
    "8": { "x": 28.7, "y": 26.6, "w": 8.0, "h": 16.0 },
    "9": { "x": 39.3, "y": 26.6, "w": 8.0, "h": 16.0 },
    "10": { "x": 49.6, "y": 26.6, "w": 8.0, "h": 16.0 },
    "11": { "x": 59.9, "y": 26.6, "w": 8.0, "h": 16.0 },
    "12": { "x": 70.5, "y": 26.6, "w": 8.0, "h": 16.0 },
    "13": { "x": 80.7, "y": 26.6, "w": 8.0, "h": 16.0 }
  },
  "granaryPositions": {
    "playerOne": { "x": 26.1, "y": 48.5, "w": 17.0, "h": 15.5 },
    "playerTwo": { "x": 73.4, "y": 48.5, "w": 17.0, "h": 15.5 }
  }
}'::jsonb
WHERE name = 'Original Dark';

-- Futuriste (if it exists in DB)
UPDATE board_skins
SET calibration = '{
  "pitPositions": {
    "0": { "x": 80.5, "y": 70.4, "w": 8.5, "h": 15.5 },
    "1": { "x": 70.5, "y": 70.5, "w": 8.5, "h": 15.5 },
    "2": { "x": 60.0, "y": 70.5, "w": 8.5, "h": 15.5 },
    "3": { "x": 49.7, "y": 70.5, "w": 8.5, "h": 15.5 },
    "4": { "x": 39.2, "y": 70.5, "w": 8.5, "h": 15.5 },
    "5": { "x": 28.9, "y": 70.5, "w": 8.5, "h": 15.5 },
    "6": { "x": 18.7, "y": 70.5, "w": 8.5, "h": 15.5 },
    "7": { "x": 18.7, "y": 27.5, "w": 8.5, "h": 15.5 },
    "8": { "x": 28.9, "y": 27.5, "w": 8.5, "h": 15.5 },
    "9": { "x": 39.3, "y": 27.5, "w": 8.5, "h": 15.5 },
    "10": { "x": 49.7, "y": 27.5, "w": 8.5, "h": 15.5 },
    "11": { "x": 60.1, "y": 27.5, "w": 8.5, "h": 15.5 },
    "12": { "x": 70.5, "y": 27.5, "w": 8.5, "h": 15.5 },
    "13": { "x": 80.5, "y": 27.5, "w": 8.5, "h": 15.5 }
  },
  "granaryPositions": {
    "playerOne": { "x": 25.8, "y": 48.5, "w": 14.0, "h": 18.5 },
    "playerTwo": { "x": 73.4, "y": 48.5, "w": 14.0, "h": 18.5 }
  }
}'::jsonb
WHERE name = 'Futuriste';

-- 4. RLS policy: only admins can update board_skins calibration
CREATE POLICY "Admins can update board skins"
  ON board_skins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 5. Prevent non-admins from modifying is_admin via profile update
-- Drop and recreate the profile update policy to exclude is_admin
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Non-admins cannot change is_admin field
      is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    )
  );
