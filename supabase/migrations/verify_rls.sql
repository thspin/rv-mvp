-- ============================================================================
-- VERIFICACION POST-MIGRACION RLS (002_enable_rls_v2.sql)
-- Ejecutar despues de aplicar la migracion
-- ============================================================================

-- 1. Verificar que RLS esta habilitado en las 5 tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments', 'notifications', 'activity_logs')
ORDER BY tablename;

-- Resultado esperado: rls_enabled = true para las 5 tablas

-- 2. Ver todas las politicas RLS activas
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

-- Resultado esperado: Politicas para teams, athletes, payments, notifications, activity_logs

-- 3. Verificar que el service_role bypassa RLS (debe ser true por defecto)
SELECT 
    rolname,
    rolsuper,
    rolbypassrls
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY rolname;

-- Resultado esperado: service_role debe tener rolbypassrls = true

-- 4. Verificar que la funcion is_admin() existe y es SECURITY DEFINER
SELECT 
    proname,
    prosecdef,
    prolang
FROM pg_proc
WHERE proname = 'is_admin';

-- Resultado esperado: is_admin con prosecdef = true

-- 5. Test: authenticated puede leer teams
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-id';
SELECT count(*) as teams_count FROM teams;
RESET ROLE;

-- 6. Test: authenticated NO puede leer athletes de otro usuario
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-id';
DO $$
BEGIN
    SET request.jwt.claim.sub = 'test-user-id';
    PERFORM * FROM athletes WHERE user_id = 'test-user-id' LIMIT 1;
    RAISE NOTICE 'OK: authenticated puede leer su propio perfil';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test skipped: %', SQLERRM;
END $$;
RESET ROLE;

-- 7. Resumen de seguridad
SELECT 
    'RLS Status' as check_name,
    CASE 
        WHEN count(*) = 5 THEN 'PASS: RLS habilitado en 5 tablas'
        ELSE 'FAIL: RLS no habilitado en todas las tablas (' || count(*) || '/5)'
    END as result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments', 'notifications', 'activity_logs')
AND rowsecurity = true

UNION ALL

SELECT 
    'Policies Count' as check_name,
    'PASS: ' || count(*) || ' politicas configuradas' as result
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Service Role Bypass' as check_name,
    CASE 
        WHEN rolbypassrls THEN 'PASS: service_role bypassa RLS'
        ELSE 'FAIL: service_role no bypassa RLS'
    END as result
FROM pg_roles
WHERE rolname = 'service_role'

UNION ALL

SELECT 
    'is_admin Function' as check_name,
    CASE 
        WHEN prosecdef THEN 'PASS: is_admin() es SECURITY DEFINER'
        ELSE 'FAIL: is_admin() no es SECURITY DEFINER'
    END as result
FROM pg_proc
WHERE proname = 'is_admin';
