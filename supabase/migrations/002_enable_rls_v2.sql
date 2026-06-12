-- ============================================================================
-- MIGRATION 002: Enable RLS with Better Auth integration
-- Purpose: Full RLS policies using JWT custom signed with Supabase JWT Secret
-- ============================================================================

-- ============================================================================
-- FUNCION HELPER: is_admin()
-- Evita recursion infinita en las politicas RLS
-- SECURITY DEFINER ejecuta como owner de la tabla (postgres)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(check_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athletes
    WHERE athletes.user_id = check_user_id::TEXT
      AND athletes.role = 'admin'
  );
$$;

-- ============================================================================
-- FUNCION HELPER: auth_uid()
-- Retorna el claim sub (id del usuario Better Auth) como TEXT.
-- Esto evita errores de conversión a UUID que ocurren con auth.uid() estándar de Supabase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::TEXT;
$$;

-- ============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITICAS PARA teams
-- ============================================================================

DROP POLICY IF EXISTS "teams_anon_select" ON teams;
DROP POLICY IF EXISTS "teams_select_auth" ON teams;
DROP POLICY IF EXISTS "teams_insert_admin" ON teams;
DROP POLICY IF EXISTS "teams_update_admin" ON teams;
DROP POLICY IF EXISTS "teams_delete_admin" ON teams;

CREATE POLICY "teams_select_auth" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "teams_insert_admin" ON teams
  FOR INSERT TO authenticated WITH CHECK (is_admin(public.auth_uid()));

CREATE POLICY "teams_update_admin" ON teams
  FOR UPDATE TO authenticated USING (is_admin(public.auth_uid()));

CREATE POLICY "teams_delete_admin" ON teams
  FOR DELETE TO authenticated USING (is_admin(public.auth_uid()));

-- ============================================================================
-- POLITICAS PARA athletes
-- ============================================================================

DROP POLICY IF EXISTS "athletes_no_anon" ON athletes;
DROP POLICY IF EXISTS "athletes_select" ON athletes;
DROP POLICY IF EXISTS "athletes_update" ON athletes;
DROP POLICY IF EXISTS "athletes_insert_own" ON athletes;
DROP POLICY IF EXISTS "athletes_delete_admin" ON athletes;

CREATE POLICY "athletes_select" ON athletes
  FOR SELECT TO authenticated
  USING (user_id = public.auth_uid() OR is_admin(public.auth_uid()));

CREATE POLICY "athletes_update" ON athletes
  FOR UPDATE TO authenticated
  USING (user_id = public.auth_uid() OR is_admin(public.auth_uid()))
  WITH CHECK (user_id = public.auth_uid() OR is_admin(public.auth_uid()));

CREATE POLICY "athletes_insert_own" ON athletes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "athletes_delete_admin" ON athletes
  FOR DELETE TO authenticated USING (is_admin(public.auth_uid()));

-- ============================================================================
-- POLITICAS PARA payments
-- ============================================================================

DROP POLICY IF EXISTS "payments_no_anon" ON payments;
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert_admin" ON payments;
DROP POLICY IF EXISTS "payments_update_admin" ON payments;
DROP POLICY IF EXISTS "payments_delete_admin" ON payments;

CREATE POLICY "payments_select" ON payments
  FOR SELECT TO authenticated
  USING (
    athlete_email = (SELECT email FROM public.athletes WHERE user_id = public.auth_uid() LIMIT 1)
    OR is_admin(public.auth_uid())
  );

CREATE POLICY "payments_insert_admin" ON payments
  FOR INSERT TO authenticated WITH CHECK (is_admin(public.auth_uid()));

CREATE POLICY "payments_update_admin" ON payments
  FOR UPDATE TO authenticated USING (is_admin(public.auth_uid()));

CREATE POLICY "payments_delete_admin" ON payments
  FOR DELETE TO authenticated USING (is_admin(public.auth_uid()));

-- ============================================================================
-- POLITICAS PARA notifications
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated USING (user_id = public.auth_uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated USING (user_id = public.auth_uid());

CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT TO authenticated WITH CHECK (is_admin(public.auth_uid()));

-- ============================================================================
-- POLITICAS PARA activity_logs
-- ============================================================================

DROP POLICY IF EXISTS "activity_logs_select_admin" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_admin" ON activity_logs;

CREATE POLICY "activity_logs_select_admin" ON activity_logs
  FOR SELECT TO authenticated USING (is_admin(public.auth_uid()));

CREATE POLICY "activity_logs_insert_admin" ON activity_logs
  FOR INSERT TO authenticated WITH CHECK (is_admin(public.auth_uid()));
