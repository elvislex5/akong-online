-- ============================================
-- SOLUTION SIMPLE : Trigger sans board_skins
-- ============================================
-- Ce script retire COMPLÈTEMENT les board skins du trigger
-- L'inscription fonctionnera même si board_skins n'existe pas

-- ============================================
-- 1. TRIGGER SIMPLE (sans board_skins)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_username TEXT;
BEGIN
  -- Generate a random username from email (user can change it later)
  random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);

  -- Insert profile with generated username (NO board_skin reference)
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

-- ============================================
-- 2. NETTOYAGE (optionnel - supprime Original Dark)
-- ============================================

-- Supprimer Original Dark si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'board_skins') THEN
    DELETE FROM board_skins WHERE name = 'Original Dark';
    RAISE NOTICE 'Original Dark supprimé';
  END IF;
END $$;

-- ============================================
-- 3. VÉRIFICATION
-- ============================================

-- Vérifier que le trigger existe et est actif
SELECT
  t.tgname AS trigger_name,
  'ACTIF' AS status
FROM pg_trigger t
WHERE t.tgrelid = 'auth.users'::regclass
  AND t.tgname = 'on_auth_user_created';

-- ============================================
-- SUCCESS
-- ============================================

SELECT 'Trigger simplifié avec succès ! L''inscription devrait fonctionner maintenant.' AS message;
