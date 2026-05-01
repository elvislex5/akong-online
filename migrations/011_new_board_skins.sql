-- ============================================
-- Migration 011: New board skins (rectangular collection)
-- ============================================
-- Adds the three new rectangular skins (ebene, iroko, terre) generated
-- after the UI/UX refonte, and deactivates the legacy "Original Dark"
-- skin which pointed to /akong.png (file removed during the refonte).
--
-- Source PNGs are in public/boards/ with transparent backgrounds.
-- Each new skin still needs calibration via the BoardCalibrationTool
-- (admin only) — the board renders but pit positions will be the
-- defaults until calibration is saved.
-- ============================================

BEGIN;

-- 1. Deactivate the legacy "Original Dark" skin.
--    Users who had it selected fall back to Classic Wood via the
--    application logic in services/boardSkinService.ts.
UPDATE board_skins
   SET is_active = false
 WHERE name = 'Original Dark';

-- 2. Insert the three new rectangular skins (free, active, no premium gate).
INSERT INTO board_skins (name, description, image_url, price, is_premium, is_active)
VALUES
  ('Ébène', 'Ébène patiné, finition mate, silhouette rectangulaire contemporaine.', '/boards/ebene.png', 0, false, true),
  ('Iroko', 'Iroko huilé doré, grain visible, esthétique club gabonais.', '/boards/iroko.png', 0, false, true),
  ('Terre cuite', 'Terre cuite ocre, finition mate, plateau de poterie populaire.', '/boards/terre.png', 0, false, true)
ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description,
      image_url   = EXCLUDED.image_url,
      is_active   = true,
      updated_at  = now();

-- 3. Unlock all three new skins for every existing user (no premium gate).
DO $$
DECLARE
  skin_record RECORD;
BEGIN
  FOR skin_record IN
    SELECT id FROM board_skins WHERE name IN ('Ébène', 'Iroko', 'Terre cuite')
  LOOP
    INSERT INTO user_board_skins (user_id, skin_id)
    SELECT id, skin_record.id FROM profiles
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

COMMIT;

-- ============================================
-- Verification queries (run manually after applying)
-- ============================================
--
-- SELECT name, image_url, is_active FROM board_skins ORDER BY created_at;
--   Expected: Classic Wood (active), Original Dark (inactive),
--             Ébène (active), Iroko (active), Terre cuite (active)
--
-- SELECT s.name, COUNT(us.user_id) AS unlocked_users
--   FROM board_skins s
--   LEFT JOIN user_board_skins us ON us.skin_id = s.id
--  GROUP BY s.name
--  ORDER BY s.created_at;
