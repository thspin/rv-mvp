-- ============================================================================
-- SCRIPT DE CREACION DE TABLAS Y RLS PARA RV EN SUPABASE
-- ============================================================================

-- 1. Habilitar extension para UUIDs (si no esta habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar tablas si existen (opcional, para resetear)
-- DROP TABLE IF EXISTS payments;
-- DROP TABLE IF EXISTS athletes;
-- DROP TABLE IF EXISTS teams;

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
    logo_url TEXT DEFAULT '/rv-logo.svg'
);

-- 4. Crear tabla de Atletas (athletes)
CREATE TABLE IF NOT EXISTS athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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
    apto_medico_status TEXT CHECK (apto_medico_status IN ('no_entregado', 'pendiente_verificacion', 'vigente', 'rechazado')) DEFAULT 'no_entregado',
    apto_medico_vencimiento TIMESTAMPTZ,
    apto_medico_motivo_rechazo TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team_status TEXT CHECK (team_status IN ('pendiente', 'activo')),
    payment_status TEXT CHECK (payment_status IN ('Pendiente_Pago', 'Pendiente_Verificacion', 'Pagado', 'Vencido')),
    payment_receipt_url TEXT,
    payment_method TEXT,
    payment_motivo_rechazo TEXT
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

-- Sembrar equipo por defecto con el UUID que espera la aplicacion
INSERT INTO teams (id, name, description, whatsapp_url, training_days, coach, instructions, location, logo_url)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'RV equipo de montaña',
    'Grupo de entrenamiento especializado en Trail Running, ultra maratones y carreras de montaña en todos los niveles. Entrenamientos presenciales guiados por profesionales.',
    'https://chat.whatsapp.com/RVEquipoMontanaSimulado',
    'Martes y Jueves 19:00 hs, Sábados 8:00 hs',
    'Ramiro Valenzuela',
    'Para el entrenamiento de este martes, traer linterna frontal y mochila de hidratación. Haremos cuestas acumuladas de 400m en el circuito de cerro.',
    'Mendoza, Argentina',
    '/rv-logo.svg'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- POLITICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ============================================================================

-- Habilitar RLS en las tablas
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Funcion helper para verificar admin (evita recursion infinita en RLS)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM athletes
    WHERE athletes.user_id = uid AND athletes.role = 'admin'
  );
$$;

-- 1. Politicas para TEAMS
-- Lectura publica para usuarios autenticados
CREATE POLICY "Permitir lectura de equipos a usuarios autenticados" 
ON teams FOR SELECT 
TO authenticated 
USING (true);

-- Escritura restringida a administradores
CREATE POLICY "Permitir edicion de equipos solo a administradores" 
ON teams FOR ALL 
TO authenticated 
USING (
    public.is_admin(auth.uid())
);

-- 2. Politicas para ATHLETES
-- Permitir que un usuario lea su propio perfil o que un admin lea todos
CREATE POLICY "Permitir lectura de perfiles propia o de admins" 
ON athletes FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid())
);

-- Permitir que un usuario modifique su propio perfil o que un admin modifique todos
CREATE POLICY "Permitir edicion de perfil propia o de admins" 
ON athletes FOR UPDATE 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid())
);

-- Permitir inserts durante el primer registro (ej. getCurrentUserAsync crea el atleta)
CREATE POLICY "Permitir insercion a usuarios autenticados" 
ON athletes FOR INSERT 
TO authenticated 
WITH CHECK (
    user_id = auth.uid()
);

-- 3. Politicas para PAYMENTS
-- Permitir que el atleta lea su historial de pagos o que el admin lea todos
CREATE POLICY "Permitir lectura de pagos propia o de admins" 
ON payments FOR SELECT 
TO authenticated 
USING (
    athlete_email = (SELECT email FROM athletes WHERE user_id = auth.uid() LIMIT 1)
    OR public.is_admin(auth.uid())
);

-- Permitir inserciones a atletas (para simular reportes de pago) y administradores
CREATE POLICY "Permitir insercion de pagos a atletas y admins" 
ON payments FOR INSERT 
TO authenticated 
WITH CHECK (
    athlete_email = (SELECT email FROM athletes WHERE user_id = auth.uid() LIMIT 1)
    OR public.is_admin(auth.uid())
);
