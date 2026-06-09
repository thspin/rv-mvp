-- Better Auth tables
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

-- Drop RLS policies that reference user_id
DROP POLICY IF EXISTS "Permitir insercion a usuarios autenticados" ON athletes;
DROP POLICY IF EXISTS "Permitir lectura de perfiles propia o de admins" ON athletes;
DROP POLICY IF EXISTS "Permitir edicion de perfil propia o de admins" ON athletes;
DROP POLICY IF EXISTS "Permitir lectura de pagos propia o de admins" ON payments;
DROP POLICY IF EXISTS "Permitir insercion de pagos a atletas y admins" ON payments;
DROP POLICY IF EXISTS "Permitir lectura de equipos a usuarios autenticados" ON teams;
DROP POLICY IF EXISTS "Permitir edicion de equipos solo a administradores" ON teams;

-- Disable RLS
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Migrate existing athletes' user_ids to "user" table
INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
SELECT user_id, name, email, true, now(), now()
FROM athletes
WHERE user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate athletes.user_id FK from auth.users to "user"(id)
ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_user_id_fkey;
ALTER TABLE athletes ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE athletes ADD CONSTRAINT athletes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
