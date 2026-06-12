-- ============================================================================
-- SCRIPT DE CREACION DE TABLAS PARA RV
-- Auth: Better Auth | DB: Supabase PostgreSQL
-- ============================================================================

-- 1. Habilitar extension para UUIDs (si no esta habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLAS DE BETTER AUTH
-- ============================================================================

CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    image TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    role TEXT DEFAULT 'atleta'
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP,
    "refreshTokenExpiresAt" TIMESTAMP,
    scope TEXT,
    "idToken" TEXT,
    password TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLAS DE APLICACION
-- ============================================================================

-- 3. Crear tabla de Equipos (teams)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    whatsapp_url TEXT,
    training_days TEXT,
    coach TEXT,
    instructions TEXT,
    location TEXT,
    logo_url TEXT DEFAULT '/rv-logo.png',
    founded_date TEXT,
    specialties TEXT,
    special_instructions TEXT,
    google_maps_url TEXT,
    subscription_plans TEXT,
    bank_cbu TEXT,
    bank_alias TEXT
);

-- 4. Crear tabla de Atletas (athletes)
CREATE TABLE IF NOT EXISTS athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('atleta', 'admin')) DEFAULT 'atleta',
    onboarding_complete BOOLEAN DEFAULT false,
    dni TEXT,
    phone TEXT,
    talle_remera TEXT,
    contacto_emergencia_name TEXT,
    contacto_emergencia_phone TEXT,
    grupo_sanguineo TEXT,
    alergias TEXT,
    afecciones TEXT,
    apto_medico_url TEXT,
    apto_medico_status TEXT CHECK (apto_medico_status IN ('no_entregado', 'pendiente_verificacion', 'vigente', 'rechazado', 'vencido')) DEFAULT 'no_entregado',
    apto_medico_vencimiento TIMESTAMPTZ,
    apto_medico_motivo_rechazo TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team_status TEXT CHECK (team_status IN ('pendiente', 'activo')),
    payment_status TEXT CHECK (payment_status IN ('Pendiente_Pago', 'Pendiente_Verificacion', 'Pagado', 'Vencido')),
    payment_receipt_url TEXT,
    payment_method TEXT,
    payment_motivo_rechazo TEXT,
    genero TEXT,
    fecha_nacimiento TEXT,
    tipo_documento TEXT,
    pais TEXT,
    provincia TEXT,
    ciudad TEXT,
    codigo_postal TEXT,
    domicilio TEXT,
    documento_url TEXT,
    documento_status TEXT CHECK (documento_status IN ('no_entregado', 'pendiente_verificacion', 'vigente', 'rechazado')) DEFAULT 'no_entregado',
    avatar_url TEXT,
    mora_months INTEGER DEFAULT 0,
    subscription_plan_id TEXT,
    next_payment_due  TIMESTAMPTZ,
    last_payment_date TIMESTAMPTZ
);

-- 5. Crear tabla de Pagos (payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_email TEXT NOT NULL,
    athlete_name TEXT,
    amount NUMERIC NOT NULL,
    method TEXT,
    status TEXT CHECK (status IN ('aprobado', 'rechazado')) DEFAULT 'aprobado',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SEMILLAS INICIALES (SEED DATA)
-- ============================================================================

INSERT INTO teams (id, name, description, whatsapp_url, training_days, coach, instructions, location, logo_url, founded_date, specialties)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'RV equipo de montaña',
    'Grupo de entrenamiento especializado en Trail Running, ultra maratones y carreras de montaña en todos los niveles. Entrenamientos presenciales guiados por profesionales.',
    'https://chat.whatsapp.com/RVEquipoMontanaSimulado',
    'Martes y Jueves 19:00 hs, Sábados 8:00 hs',
    'Ramiro Valenzuela',
    'Para el entrenamiento de este martes, traer linterna frontal y mochila de hidratación. Haremos cuestas acumuladas de 400m en el circuito de cerro.',
    'La Rioja, Argentina',
    '/rv-logo.png',
    '2016-06-08',
    'Trail Running,Ultra Trail,Ruta / Calle,Funcional'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS HABILITADO - Ver supabase/migrations/002_enable_rls_v2.sql
-- Autorizacion: RLS policies + Better Auth JWT custom
-- ============================================================================

-- ============================================================================
-- MIGRACION DE FK: athletes.user_id de auth.users a "user"(id) de Better Auth
-- Ejecutar solo si ya existen datos con Supabase Auth
-- ============================================================================

-- Paso 1: Drop FK antigua (si existe)
-- ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_user_id_fkey;

-- Paso 2: Migrar datos - crear registros en "user" basados en athletes existentes
-- INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
-- SELECT user_id, name, email, true, now(), now()
-- FROM athletes
-- WHERE user_id IS NOT NULL
-- ON CONFLICT (id) DO NOTHING;

-- Paso 3: Agregar nueva FK
-- ALTER TABLE athletes ADD CONSTRAINT athletes_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- 6. Crear tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS habilitado via migracion 002_enable_rls_v2.sql

-- 7. Crear tabla de Actividades (activity_logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    athlete_name TEXT,
    athlete_email TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS habilitado via migracion 002_enable_rls_v2.sql

-- ============================================================================
-- 8. site_settings (key/value app-level config) - ver supabase/migrations/005
-- Almacena monthly_fee, currency, payment_due_day, etc. Editable desde admin.
-- ============================================================================
CREATE TABLE IF NOT EXISTS site_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

INSERT INTO site_settings (key, value) VALUES
    ('monthly_fee',     '17000'::jsonb),
    ('currency',        '"ARS"'::jsonb),
    ('payment_due_day', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 9. payment_reminder_log (idempotency for daily payment cron)
-- Idempotencia via UNIQUE INDEX con expresion (Postgres no permite expresiones
-- en UNIQUE inline; hay que crearlo como index separado).
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_reminder_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id    UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_reminder_log_daily
    ON payment_reminder_log (athlete_id, reminder_type, ((sent_at AT TIME ZONE 'UTC')::date));

CREATE INDEX IF NOT EXISTS idx_payment_reminder_log_athlete
    ON payment_reminder_log (athlete_id);

CREATE INDEX IF NOT EXISTS idx_athletes_next_payment_due_active
    ON athletes (next_payment_due)
    WHERE team_status = 'activo' AND payment_status IS DISTINCT FROM 'Pagado';

-- ============================================================================
-- RLS: site_settings
-- Lectura: cualquier usuario autenticado. Escritura: solo admin.
-- ============================================================================
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select_auth"   ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_write"   ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update"  ON site_settings;

CREATE POLICY "site_settings_select_auth"
    ON site_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "site_settings_admin_write"
    ON site_settings FOR INSERT TO authenticated
    WITH CHECK (is_admin(auth.uid()::TEXT));

CREATE POLICY "site_settings_admin_update"
    ON site_settings FOR UPDATE TO authenticated
    USING (is_admin(auth.uid()::TEXT))
    WITH CHECK (is_admin(auth.uid()::TEXT));

-- ============================================================================
-- RLS: payment_reminder_log
-- Lectura: solo admin. Inserción: solo service_role (cron).
-- ============================================================================
ALTER TABLE payment_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_reminder_log_select_admin" ON payment_reminder_log;

CREATE POLICY "payment_reminder_log_select_admin"
    ON payment_reminder_log FOR SELECT TO authenticated
    USING (is_admin(auth.uid()::TEXT));
