-- ============================================
-- Migration 018: Friendships (Module Connect §8.2 — MUST V1)
-- ============================================
-- Twitter-style follow model adapted to a symmetric friendship:
--   - One row per relationship, stored from the requester's side
--   - status flows: pending → accepted (or row is DELETEd on decline/unfriend)
--   - Functional UNIQUE index on the unordered pair prevents A↔B duplicates
--
-- The status column also supports 'blocked' to back a future block list,
-- but the V1 UI only uses pending / accepted.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.friendships (
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  PRIMARY KEY (requester_id, addressee_id),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

-- Prevent A→B + B→A duplicates regardless of who sent the first request
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unordered_pair_idx
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS friendships_addressee_status_idx
  ON public.friendships (addressee_id, status);

CREATE INDEX IF NOT EXISTS friendships_requester_status_idx
  ON public.friendships (requester_id, status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: only the two parties can see the row
DROP POLICY IF EXISTS "Friendship visible to both parties" ON public.friendships;
CREATE POLICY "Friendship visible to both parties"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- INSERT: only as the requester
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- UPDATE: only the addressee can accept/decline (toggling status)
DROP POLICY IF EXISTS "Addressee can respond to a request" ON public.friendships;
CREATE POLICY "Addressee can respond to a request"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- DELETE: either party can remove the relationship (cancel, decline, unfriend)
DROP POLICY IF EXISTS "Either party can remove friendship" ON public.friendships;
CREATE POLICY "Either party can remove friendship"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Table exists:
--    \d+ public.friendships
--
-- b) Policies registered:
--    SELECT policyname FROM pg_policies WHERE tablename = 'friendships';
--
-- c) Manual smoke test:
--    -- as user A:
--    INSERT INTO friendships (requester_id, addressee_id) VALUES ('A_uuid','B_uuid');
--    -- duplicate request (B→A) should fail:
--    INSERT INTO friendships (requester_id, addressee_id) VALUES ('B_uuid','A_uuid');
--    -- as user B:
--    UPDATE friendships SET status='accepted', responded_at=NOW()
--     WHERE requester_id='A_uuid' AND addressee_id='B_uuid';
