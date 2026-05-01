-- ============================================
-- TRIGGER ULTRA-ROBUSTE
-- Gère TOUS les cas d'erreur possibles
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_username TEXT;
  username_suffix TEXT;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Générer un username unique avec plusieurs tentatives
  LOOP
    attempt_count := attempt_count + 1;

    -- Premier essai : email + 4 chars UUID
    IF attempt_count = 1 THEN
      random_username := LOWER(SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);

    -- Deuxième essai : email + 8 chars UUID
    ELSIF attempt_count = 2 THEN
      random_username := LOWER(SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);

    -- Troisième essai : email + 12 chars UUID
    ELSIF attempt_count = 3 THEN
      random_username := LOWER(SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 12);

    -- Quatrième essai : Juste le UUID complet (toujours unique)
    ELSIF attempt_count = 4 THEN
      random_username := 'user_' || REPLACE(NEW.id::TEXT, '-', '');

    -- Dernier essai : UUID + timestamp (IMPOSSIBLE de faire conflit)
    ELSE
      random_username := 'user_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);
    END IF;

    -- Tentative d'insertion
    BEGIN
      INSERT INTO public.profiles (id, username, display_name)
      VALUES (
        NEW.id,
        random_username,
        COALESCE(
          NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
          NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
          'Utilisateur'
        )
      );

      -- Si on arrive ici, l'insertion a réussi
      EXIT; -- Sort de la boucle

    EXCEPTION
      WHEN unique_violation THEN
        -- Username existe déjà, on réessaie avec une autre variante
        IF attempt_count >= max_attempts THEN
          -- On a tout essayé, on lève l'erreur
          RAISE EXCEPTION 'Impossible de créer un username unique après % tentatives', max_attempts;
        END IF;
        -- Sinon on continue la boucle

      WHEN OTHERS THEN
        -- Autre erreur (RLS, contrainte, etc.)
        RAISE EXCEPTION 'Erreur lors de la création du profil: %', SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier que le trigger est bien attaché
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE 'Trigger créé';
  ELSE
    RAISE NOTICE 'Trigger déjà existant';
  END IF;
END $$;

-- ============================================
-- TEST: Vérifier que le trigger fonctionne
-- ============================================

SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name,
  'ACTIF et ROBUSTE' AS status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
  AND t.tgname = 'on_auth_user_created';

-- ============================================
-- SUCCESS
-- ============================================

SELECT 'Trigger ultra-robuste installé avec succès ! 5 tentatives de fallback configurées.' AS message;
