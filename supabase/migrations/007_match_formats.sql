-- ============================================
-- MIGRATION 007 : Système de Match Multi-Format
-- ============================================
-- 4 Formats : Infini, Traditionnel 6, Traditionnel 2, Premier à X
-- Respecte la tradition du Songo tout en offrant flexibilité

-- 1. Ajouter colonnes pour le système de match
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS match_format TEXT DEFAULT 'infinite',
ADD COLUMN IF NOT EXISTS match_target INTEGER,
ADD COLUMN IF NOT EXISTS match_score_host INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_score_guest INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS match_winner_id UUID REFERENCES auth.users(id);

-- Contraintes sur match_format
ALTER TABLE public.game_rooms
ADD CONSTRAINT valid_match_format
CHECK (match_format IN ('infinite', 'traditional_6', 'traditional_2', 'first_to_x'));

-- Contraintes sur match_status
ALTER TABLE public.game_rooms
ADD CONSTRAINT valid_match_status
CHECK (match_status IN ('in_progress', 'completed', 'abandoned'));

-- Comments
COMMENT ON COLUMN public.game_rooms.match_format IS 'Format: infinite, traditional_6 (6 parties), traditional_2 (2 aller-retour), first_to_x (premier à X)';
COMMENT ON COLUMN public.game_rooms.match_target IS 'Pour first_to_x: nombre de victoires pour gagner le match (2, 3, 5, 7, etc.)';
COMMENT ON COLUMN public.game_rooms.match_score_host IS 'Nombre de parties gagnées par le host dans ce match';
COMMENT ON COLUMN public.game_rooms.match_score_guest IS 'Nombre de parties gagnées par le guest dans ce match';
COMMENT ON COLUMN public.game_rooms.match_status IS 'État du match: in_progress, completed, abandoned';
COMMENT ON COLUMN public.game_rooms.match_winner_id IS 'Gagnant du match complet (null si en cours ou infini)';

-- ============================================
-- 2. Table pour historique des parties d'un match
-- ============================================
CREATE TABLE IF NOT EXISTS public.match_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  game_number INTEGER NOT NULL, -- 1, 2, 3, 4, 5, 6...
  winner_id UUID REFERENCES auth.users(id),
  final_score_host INTEGER NOT NULL,
  final_score_guest INTEGER NOT NULL,
  game_state JSONB, -- État final de la partie (optionnel)
  duration_seconds INTEGER, -- Durée de la partie
  played_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, game_number)
);

CREATE INDEX IF NOT EXISTS match_games_room_idx ON public.match_games(room_id, game_number);
CREATE INDEX IF NOT EXISTS match_games_played_at_idx ON public.match_games(played_at DESC);

COMMENT ON TABLE public.match_games IS 'Historique de toutes les parties jouées dans un match';
COMMENT ON COLUMN public.match_games.game_number IS 'Numéro de la partie dans le match (1-6 pour traditionnel)';

-- ============================================
-- 3. Ajouter stats de MATCH aux profils
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_lost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_drawn INTEGER DEFAULT 0;

COMMENT ON COLUMN public.profiles.matches_played IS 'Nombre de MATCHS complets joués (≠ parties)';
COMMENT ON COLUMN public.profiles.matches_won IS 'Nombre de MATCHS gagnés';
COMMENT ON COLUMN public.profiles.matches_lost IS 'Nombre de MATCHS perdus';
COMMENT ON COLUMN public.profiles.matches_drawn IS 'Nombre de MATCHS nuls (traditionnel 6 ou 2 seulement)';

-- ============================================
-- 4. Fonctions pour gérer le match
-- ============================================

-- 4.1 Enregistrer une partie terminée dans le match
CREATE OR REPLACE FUNCTION public.record_match_game(
  p_room_id UUID,
  p_winner_id UUID,
  p_score_host INTEGER,
  p_score_guest INTEGER,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_game_state JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room public.game_rooms%ROWTYPE;
  v_game_number INTEGER;
  v_match_complete BOOLEAN := FALSE;
  v_match_winner_id UUID := NULL;
  v_host_score INTEGER;
  v_guest_score INTEGER;
BEGIN
  -- Récupérer la room
  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Calculer le numéro de la partie
  SELECT COALESCE(MAX(game_number), 0) + 1 INTO v_game_number
  FROM public.match_games
  WHERE room_id = p_room_id;

  -- Insérer l'historique de la partie
  INSERT INTO public.match_games (
    room_id, game_number, winner_id,
    final_score_host, final_score_guest,
    game_state, duration_seconds
  ) VALUES (
    p_room_id, v_game_number, p_winner_id,
    p_score_host, p_score_guest,
    p_game_state, p_duration_seconds
  );

  -- Mettre à jour le score du match
  IF p_winner_id = v_room.host_id THEN
    UPDATE public.game_rooms
    SET match_score_host = match_score_host + 1
    WHERE id = p_room_id
    RETURNING match_score_host, match_score_guest INTO v_host_score, v_guest_score;
  ELSIF p_winner_id = v_room.guest_id THEN
    UPDATE public.game_rooms
    SET match_score_guest = match_score_guest + 1
    WHERE id = p_room_id
    RETURNING match_score_host, match_score_guest INTO v_host_score, v_guest_score;
  ELSE
    -- Match nul pour cette partie (ne change pas le score)
    SELECT match_score_host, match_score_guest INTO v_host_score, v_guest_score
    FROM public.game_rooms WHERE id = p_room_id;
  END IF;

  -- Vérifier si le match est terminé selon le format
  CASE v_room.match_format
    WHEN 'infinite' THEN
      -- Mode infini : jamais terminé
      v_match_complete := FALSE;

    WHEN 'traditional_6' THEN
      -- Traditionnel 6 parties : terminé après 6 parties
      IF v_game_number >= 6 THEN
        v_match_complete := TRUE;
        -- Déterminer le gagnant
        IF v_host_score > v_guest_score THEN
          v_match_winner_id := v_room.host_id;
        ELSIF v_guest_score > v_host_score THEN
          v_match_winner_id := v_room.guest_id;
        -- Sinon NULL = match nul
        END IF;
      END IF;

    WHEN 'traditional_2' THEN
      -- Traditionnel 2 parties (aller-retour) : terminé après 2 parties
      IF v_game_number >= 2 THEN
        v_match_complete := TRUE;
        IF v_host_score > v_guest_score THEN
          v_match_winner_id := v_room.host_id;
        ELSIF v_guest_score > v_host_score THEN
          v_match_winner_id := v_room.guest_id;
        END IF;
      END IF;

    WHEN 'first_to_x' THEN
      -- Premier à X : terminé quand un joueur atteint X victoires
      IF v_host_score >= v_room.match_target THEN
        v_match_complete := TRUE;
        v_match_winner_id := v_room.host_id;
      ELSIF v_guest_score >= v_room.match_target THEN
        v_match_complete := TRUE;
        v_match_winner_id := v_room.guest_id;
      END IF;
  END CASE;

  -- Marquer le match comme terminé si applicable
  IF v_match_complete THEN
    UPDATE public.game_rooms
    SET match_status = 'completed',
        match_winner_id = v_match_winner_id,
        finished_at = NOW()
    WHERE id = p_room_id;
  END IF;

  -- Retourner les infos
  RETURN jsonb_build_object(
    'game_number', v_game_number,
    'match_score_host', v_host_score,
    'match_score_guest', v_guest_score,
    'match_complete', v_match_complete,
    'match_winner_id', v_match_winner_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_match_game IS 'Enregistre une partie terminée et vérifie si le match est complet';

-- 4.2 Abandonner un match entier
CREATE OR REPLACE FUNCTION public.abandon_match(
  p_room_id UUID,
  p_abandoner_id UUID
)
RETURNS void AS $$
DECLARE
  v_room public.game_rooms%ROWTYPE;
  v_winner_id UUID;
BEGIN
  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Le gagnant est l'adversaire
  IF p_abandoner_id = v_room.host_id THEN
    v_winner_id := v_room.guest_id;
  ELSE
    v_winner_id := v_room.host_id;
  END IF;

  -- Marquer le match comme abandonné
  UPDATE public.game_rooms
  SET match_status = 'abandoned',
      match_winner_id = v_winner_id,
      finished_at = NOW()
  WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.abandon_match IS 'Abandonne le match entier (pas juste une partie)';

-- 4.3 Obtenir l'historique complet d'un match
CREATE OR REPLACE FUNCTION public.get_match_history(p_room_id UUID)
RETURNS TABLE (
  game_number INTEGER,
  winner_name TEXT,
  score_host INTEGER,
  score_guest INTEGER,
  played_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mg.game_number,
    COALESCE(p.display_name, p.username) AS winner_name,
    mg.final_score_host,
    mg.final_score_guest,
    mg.played_at
  FROM public.match_games mg
  LEFT JOIN public.profiles p ON p.id = mg.winner_id
  WHERE mg.room_id = p_room_id
  ORDER BY mg.game_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_match_history IS 'Récupère l\'historique de toutes les parties d\'un match';

-- ============================================
-- 5. Trigger pour mettre à jour les stats de match
-- ============================================
CREATE OR REPLACE FUNCTION public.update_match_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement si le match vient d'être complété (pas abandonné)
  IF NEW.match_status = 'completed' AND OLD.match_status = 'in_progress' THEN
    -- Incrémenter matches_played pour les deux joueurs
    UPDATE public.profiles
    SET matches_played = matches_played + 1
    WHERE id IN (NEW.host_id, NEW.guest_id);

    -- Mettre à jour les victoires/défaites/nuls
    IF NEW.match_winner_id IS NOT NULL THEN
      -- Un joueur a gagné
      UPDATE public.profiles
      SET matches_won = matches_won + 1
      WHERE id = NEW.match_winner_id;

      -- L'autre a perdu
      UPDATE public.profiles
      SET matches_lost = matches_lost + 1
      WHERE id IN (NEW.host_id, NEW.guest_id)
        AND id != NEW.match_winner_id;
    ELSE
      -- Match nul
      UPDATE public.profiles
      SET matches_drawn = matches_drawn + 1
      WHERE id IN (NEW.host_id, NEW.guest_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_completed ON public.game_rooms;
CREATE TRIGGER on_match_completed
  AFTER UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_stats();

COMMENT ON TRIGGER on_match_completed ON public.game_rooms IS 'Met à jour les stats de match des profils quand un match se termine';

-- ============================================
-- 6. Indexes pour performance
-- ============================================
CREATE INDEX IF NOT EXISTS game_rooms_match_format_idx ON public.game_rooms(match_format);
CREATE INDEX IF NOT EXISTS game_rooms_match_status_idx ON public.game_rooms(match_status);

-- ============================================
-- SUCCESS
-- ============================================
SELECT 'Migration 007 : Système de match multi-format installé avec succès !' AS message;
