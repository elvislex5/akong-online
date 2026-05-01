-- Migration 024: Make handle_new_user trigger resilient + schema-qualified
--
-- Two bugs surfaced together:
--
-- 1. The trigger queried `board_skins` (unqualified). Recent Supabase
--    locks SECURITY DEFINER functions to search_path = '', so unqualified
--    references fail with "relation does not exist" even when the table
--    exists. Fix: every table reference is now `public.<table>`.
--
-- 2. The EXCEPTION block only caught unique_violation, so any other
--    failure (undefined_table, undefined_column, etc.) rolled back the
--    auth.users insert and surfaced as the generic "Database error
--    creating new user". Fix: wrap the optional skin work in nested
--    BEGIN/EXCEPTION blocks that swallow infra failures — profile insert
--    is the only thing that's allowed to fail signup.
--
-- Username sanitization from migration 023 is preserved.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_local       TEXT;
  sanitized_local TEXT;
  random_username TEXT;
  classic_skin_id UUID;
BEGIN
  raw_local := LOWER(SPLIT_PART(NEW.email, '@', 1));
  sanitized_local := regexp_replace(raw_local, '[^a-z0-9]', '', 'g');

  IF char_length(sanitized_local) < 3 THEN
    sanitized_local := sanitized_local || repeat('x', 3 - char_length(sanitized_local));
  END IF;

  random_username := substring(
    sanitized_local || '_' || SUBSTRING(NEW.id::TEXT, 1, 4)
    FROM 1 FOR 20
  );

  -- Best-effort: try to find Classic Wood, but never fail signup over it.
  BEGIN
    SELECT id INTO classic_skin_id FROM public.board_skins WHERE name = 'Classic Wood' LIMIT 1;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN
      classic_skin_id := NULL;
  END;

  -- Critical path: insert into profiles. This must succeed.
  INSERT INTO public.profiles (id, username, display_name, selected_board_skin)
  VALUES (NEW.id, random_username, SPLIT_PART(NEW.email, '@', 1), classic_skin_id);

  -- Best-effort: unlock skin for the user.
  IF classic_skin_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_board_skins (user_id, skin_id)
      VALUES (NEW.id, classic_skin_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION
      WHEN undefined_table OR undefined_column THEN
        NULL;  -- silently skip
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username collision: extend the UUID portion.
    random_username := substring(
      sanitized_local || '_' || SUBSTRING(NEW.id::TEXT, 1, 12)
      FROM 1 FOR 20
    );
    INSERT INTO public.profiles (id, username, display_name, selected_board_skin)
    VALUES (NEW.id, random_username, SPLIT_PART(NEW.email, '@', 1), classic_skin_id);

    IF classic_skin_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.user_board_skins (user_id, skin_id)
        VALUES (NEW.id, classic_skin_id)
        ON CONFLICT DO NOTHING;
      EXCEPTION
        WHEN undefined_table OR undefined_column THEN
          NULL;
      END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;
