-- ============================================================================
-- MIGRATION 001: Enable RLS on application tables
-- Purpose: Restrict anon key access; service_role bypasses RLS by default
-- ============================================================================

-- Enable RLS on all application tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES FOR teams
-- Anon can read teams (public data for equipos page)
-- All mutations require service_role (bypasses RLS)
-- ============================================================================

DROP POLICY IF EXISTS "teams_anon_select" ON teams;
CREATE POLICY "teams_anon_select"
  ON teams
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- POLICIES FOR athletes
-- No anon access. All operations through service_role only.
-- service_role bypasses RLS by default, so no explicit policy needed.
-- ============================================================================

DROP POLICY IF EXISTS "athletes_no_anon" ON athletes;

-- ============================================================================
-- POLICIES FOR payments
-- No anon access. All operations through service_role only.
-- service_role bypasses RLS by default, so no explicit policy needed.
-- ============================================================================

DROP POLICY IF EXISTS "payments_no_anon" ON payments;
