-- Migration 023: Sanitize generated usernames in handle_new_user trigger
-- Bug: emails with dots, dashes or plus signs (john.doe@x.com, mail+1@y.com)
-- produced usernames that violated profiles.username_format CHECK constraint
-- (^[a-z0-9_]+$). The trigger crashed, rolling back auth.users insert, and
-- Supabase surfaced it as "Database error creating new user".
--
-- This rewrites handle_new_user to:
--   1. Strip every char outside [a-z0-9] from the email local-part
--   2. Pad to at least 3 chars when the result is too short
--   3. Append the first 4 chars of the user UUID for uniqueness
--   4. Truncate to 20 chars max (the upper bound of the CHECK constraint)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_local       TEXT;
  sanitized_local TEXT;
  random_username TEXT;
  classic_skin_id UUID;
BEGIN
  raw_local := LOWER(SPLIT_PART(NEW.email, '@', 1));

  -- Keep only [a-z0-9]; strip dots, dashes, plus signs and anything else.
  sanitized_local := regexp_replace(raw_local, '[^a-z0-9]', '', 'g');

  -- Guarantee min length 3 by padding with 'x' if needed.
  IF char_length(sanitized_local) < 3 THEN
    sanitized_local := sanitized_local || repeat('x', 3 - char_length(sanitized_local));
  END IF;

  -- Compose: <sanitized>_<uuid8> capped at 20 chars total.
  random_username := substring(
    sanitized_local || '_' || SUBSTRING(NEW.id::TEXT, 1, 4)
    FROM 1 FOR 20
  );

  SELECT id INTO classic_skin_id FROM board_skins WHERE name = 'Classic Wood' LIMIT 1;

  INSERT INTO public.profiles (id, username, display_name, selected_board_skin)
  VALUES (NEW.id, random_username, SPLIT_PART(NEW.email, '@', 1), classic_skin_id);

  IF classic_skin_id IS NOT NULL THEN
    INSERT INTO public.user_board_skins (user_id, skin_id)
    VALUES (NEW.id, classic_skin_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username collision: extend the UUID portion. Truncate to 20 again.
    random_username := substring(
      sanitized_local || '_' || SUBSTRING(NEW.id::TEXT, 1, 12)
      FROM 1 FOR 20
    );

    INSERT INTO public.profiles (id, username, display_name, selected_board_skin)
    VALUES (NEW.id, random_username, SPLIT_PART(NEW.email, '@', 1), classic_skin_id);

    IF classic_skin_id IS NOT NULL THEN
      INSERT INTO public.user_board_skins (user_id, skin_id)
      VALUES (NEW.id, classic_skin_id)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
