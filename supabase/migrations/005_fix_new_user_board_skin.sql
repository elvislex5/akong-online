-- ============================================
-- FIX: Auto-assign Classic Wood board skin to new users
-- Migration 005: Update handle_new_user() trigger
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
-- BACKFILL: Assign Classic Wood to existing users without a board skin
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
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile and assigns Classic Wood board skin on signup';
