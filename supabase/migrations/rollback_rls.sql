-- ============================================================================
-- ROLLBACK: Deshabilitar RLS (SOLO EN CASO DE EMERGENCIA)
-- ============================================================================
-- ADVERTENCIA: Este script deshabilita RLS en todas las tablas de aplicacion.
-- Solo ejecutar si hay problemas criticos despues de aplicar 002_enable_rls_v2.sql
-- La aplicacion seguira funcionando porque usa service_role, pero se pierde
-- la capa de seguridad de RLS.
-- ============================================================================

-- Eliminar todas las politicas existentes
DROP POLICY IF EXISTS "teams_anon_select" ON teams;
DROP POLICY IF EXISTS "teams_select_auth" ON teams;
DROP POLICY IF EXISTS "teams_insert_admin" ON teams;
DROP POLICY IF EXISTS "teams_update_admin" ON teams;
DROP POLICY IF EXISTS "teams_delete_admin" ON teams;

DROP POLICY IF EXISTS "athletes_no_anon" ON athletes;
DROP POLICY IF EXISTS "athletes_select" ON athletes;
DROP POLICY IF EXISTS "athletes_update" ON athletes;
DROP POLICY IF EXISTS "athletes_insert_own" ON athletes;
DROP POLICY IF EXISTS "athletes_delete_admin" ON athletes;

DROP POLICY IF EXISTS "payments_no_anon" ON payments;
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert_admin" ON payments;
DROP POLICY IF EXISTS "payments_update_admin" ON payments;
DROP POLICY IF EXISTS "payments_delete_admin" ON payments;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;

DROP POLICY IF EXISTS "activity_logs_select_admin" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_admin" ON activity_logs;

-- Eliminar funcion helper
DROP FUNCTION IF EXISTS is_admin(TEXT);

-- Deshabilitar RLS en todas las tablas
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS esta deshabilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments', 'notifications', 'activity_logs')
ORDER BY tablename;

-- Resultado esperado: rls_enabled = false para las 5 tablas
