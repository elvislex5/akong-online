-- ============================================
-- FIX IMMÉDIAT : Trigger sans board_skins
-- ============================================
-- Ce script corrige le trigger handle_new_user()
-- pour qu'il fonctionne SANS la table board_skins

-- Recréer le trigger sans référence à board_skins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_username TEXT;
BEGIN
  -- Generate a random username from email (user can change it later)
  random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);

  -- Insert profile with generated username
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    random_username,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8))
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username already exists, append more of the UUID
    random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, random_username, COALESCE(SPLIT_PART(NEW.email, '@', 1), 'user'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger existe déjà, pas besoin de le recréer
-- Il s'appelle automatiquement sur INSERT dans auth.users

SELECT 'Trigger corrigé avec succès !' AS status;
