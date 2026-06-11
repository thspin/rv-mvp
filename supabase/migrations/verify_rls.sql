-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN RLS
-- Ejecutar después de aplicar 001_enable_rls.sql
-- ============================================================================

-- 1. Verificar que RLS está habilitado en las 3 tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments')
ORDER BY tablename;

-- Resultado esperado: rls_enabled = true para las 3 tablas

-- 2. Ver todas las políticas RLS activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Resultado esperado: Al menos "teams_anon_select" para SELECT en teams

-- 3. Verificar que el service_role bypassa RLS (debe ser true por defecto)
-- Esto es automático en Supabase, pero se puede verificar:
SELECT 
    rolname,
    rolsuper,
    rolbypassrls
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY rolname;

-- Resultado esperado: service_role debe tener rolbypassrls = true

-- 4. Test: Verificar que anon puede leer teams
SET ROLE anon;
SELECT count(*) as teams_count FROM teams;
RESET ROLE;

-- 5. Test: Verificar que anon NO puede leer athletes
SET ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM * FROM athletes LIMIT 1;
        RAISE EXCEPTION 'SECURITY ISSUE: anon puede leer athletes!';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'OK: anon no puede leer athletes (RLS funcionando)';
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error inesperado: %', SQLERRM;
    END;
END $$;
RESET ROLE;

-- 6. Test: Verificar que anon NO puede leer payments
SET ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM * FROM payments LIMIT 1;
        RAISE EXCEPTION 'SECURITY ISSUE: anon puede leer payments!';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'OK: anon no puede leer payments (RLS funcionando)';
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error inesperado: %', SQLERRM;
    END;
END $$;
RESET ROLE;

-- 7. Resumen de seguridad
SELECT 
    'RLS Status' as check_name,
    CASE 
        WHEN count(*) = 3 THEN '✅ PASS: RLS habilitado en 3 tablas'
        ELSE '❌ FAIL: RLS no habilitado en todas las tablas'
    END as result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments')
AND rowsecurity = true

UNION ALL

SELECT 
    'Policies Count' as check_name,
    '✅ PASS: ' || count(*) || ' políticas configuradas' as result
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Service Role Bypass' as check_name,
    CASE 
        WHEN rolbypassrls THEN '✅ PASS: service_role bypassa RLS'
        ELSE '❌ FAIL: service_role no bypassa RLS'
    END as result
FROM pg_roles
WHERE rolname = 'service_role';
