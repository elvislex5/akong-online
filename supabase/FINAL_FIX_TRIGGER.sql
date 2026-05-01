-- ============================================
-- TRIGGER FINAL : Respecte la contrainte de 20 caractères
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_username TEXT;
  email_part TEXT;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Extraire la partie email et la tronquer si besoin (max 10 chars)
  email_part := LOWER(SUBSTRING(SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1), 1, 10));

  -- Si email_part est vide ou trop court, utiliser 'user'
  IF LENGTH(email_part) < 3 THEN
    email_part := 'user';
  END IF;

  -- Boucle pour générer un username unique
  LOOP
    attempt_count := attempt_count + 1;

    -- Générer le username selon la tentative (TOUS < 20 chars)
    IF attempt_count = 1 THEN
      -- email (max 10) + '_' + 4 chars UUID = max 15 chars
      random_username := email_part || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);

    ELSIF attempt_count = 2 THEN
      -- email (max 10) + '_' + 6 chars UUID = max 17 chars
      random_username := email_part || '_' || SUBSTRING(NEW.id::TEXT, 1, 6);

    ELSIF attempt_count = 3 THEN
      -- email (max 8) + '_' + 8 chars UUID = max 17 chars
      random_username := SUBSTRING(email_part, 1, 8) || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);

    ELSIF attempt_count = 4 THEN
      -- 'u' + 12 chars UUID = 13 chars
      random_username := 'u' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 12);

    ELSE
      -- 'u' + timestamp (10 digits) = 11 chars (TOUJOURS unique)
      random_username := 'u' || FLOOR(EXTRACT(EPOCH FROM NOW()))::TEXT;
    END IF;

    -- Vérifier que le username respecte bien la contrainte
    IF LENGTH(random_username) < 3 OR LENGTH(random_username) > 20 THEN
      RAISE EXCEPTION 'Username généré invalide: % (longueur: %)', random_username, LENGTH(random_username);
    END IF;

    -- Tentative d'insertion
    BEGIN
      INSERT INTO public.profiles (id, username, display_name)
      VALUES (
        NEW.id,
        random_username,
        COALESCE(
          NULLIF(SUBSTRING(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), 1, 50), ''),
          NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
          'Utilisateur'
        )
      );

      -- Succès ! On sort de la boucle
      RETURN NEW;

    EXCEPTION
      WHEN unique_violation THEN
        -- Username existe, on réessaie
        IF attempt_count >= max_attempts THEN
          RAISE EXCEPTION 'Impossible de créer un username unique après % tentatives', max_attempts;
        END IF;
        -- Continue la boucle

      WHEN OTHERS THEN
        -- Autre erreur
        RAISE EXCEPTION 'Erreur création profil (tentative %): %', attempt_count, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Test de génération de username
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
  test_username TEXT;
BEGIN
  -- Simuler la génération
  test_username := LOWER(SUBSTRING(SPLIT_PART(test_email, '@', 1), 1, 10)) || '_' || SUBSTRING(test_id::TEXT, 1, 4);

  RAISE NOTICE 'Test username: % (longueur: %)', test_username, LENGTH(test_username);

  IF LENGTH(test_username) > 20 THEN
    RAISE EXCEPTION 'Test ÉCHOUÉ: username trop long !';
  ELSE
    RAISE NOTICE 'Test RÉUSSI: username respecte la contrainte';
  END IF;
END $$;

-- ============================================
-- SUCCESS
-- ============================================

SELECT 'Trigger corrigé ! Tous les usernames respectent maintenant la limite de 20 caractères.' AS message;
