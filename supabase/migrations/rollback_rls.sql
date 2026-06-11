-- ============================================================================
-- ROLLBACK: Deshabilitar RLS (SOLO EN CASO DE EMERGENCIA)
-- ============================================================================
-- ⚠️ ADVERTENCIA: Este script deshabilita RLS en todas las tablas de aplicación.
-- Solo ejecutar si hay problemas críticos después de aplicar 001_enable_rls.sql
-- La aplicación seguirá funcionando porque usa service_role, pero se pierde
-- la capa de seguridad de RLS.
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "teams_anon_select" ON teams;

-- Deshabilitar RLS en todas las tablas
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments')
ORDER BY tablename;

-- Resultado esperado: rls_enabled = false para las 3 tablas
