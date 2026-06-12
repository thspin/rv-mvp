# Guía de Despliegue Seguro - MVP

## ✅ Checklist Pre-Producción

### 1. Variables de Entorno en Vercel

Configurar en **Vercel Dashboard → Settings → Environment Variables**:

```bash
# Requeridas (CRÍTICAS)
BETTER_AUTH_SECRET=<generar con: openssl rand -base64 32>
DATABASE_URL=<postgres URL de Supabase>
NEXT_PUBLIC_SUPABASE_URL=<URL de tu proyecto Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service_role key de Supabase>

# OAuth de Google
GOOGLE_CLIENT_ID=<client ID de Google OAuth>
GOOGLE_CLIENT_SECRET=<client secret de Google OAuth>

# Opcionales
BETTER_AUTH_URL=<URL personalizada si aplica>
VERCEL_URL=<automático en Vercel>

# NUNCA setear en Vercel (solo .env.local)
ENABLE_DEBUG_ENDPOINT=true  # SOLO desarrollo local - NUNCA en Vercel

# Cron Jobs (requerido en Vercel)
CRON_SECRET=<generar con: openssl rand -hex 32>  # Debe coincidir con el header de autorizacion del cron
```

**Para generar BETTER_AUTH_SECRET:**
```bash
# En PowerShell (Windows)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# O con OpenSSL (si está disponible)
openssl rand -base64 32
```

---

### 2. Aplicar Migración RLS en Base de Datos

**⚠️ IMPORTANTE: Aplicar primero en STAGING, validar, y luego en PRODUCCIÓN**

#### Opción A: Supabase Dashboard (Recomendado)

1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** (icono de terminal en el menú lateral)
4. Copiar y pegar el contenido de `supabase/migrations/001_enable_rls.sql`
5. Hacer clic en **Run**
6. Verificar que no haya errores

#### Opción B: Supabase CLI

```bash
# Instalar CLI si no está instalado
npm install -g supabase

# Login
supabase login

# Vincular proyecto (si no está vinculado)
supabase link --project-ref <tu-project-ref>

# Aplicar migraciones
supabase db push
```

#### Validación Post-Migración

Ejecutar en SQL Editor para verificar:
```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'athletes', 'payments');

-- Debe retornar rowsecurity = true para las 3 tablas

-- Verificar políticas
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Debe mostrar al menos "teams_anon_select" para SELECT
```

---

### 3. Verificación Post-Despliegue

Después de hacer push a GitHub y que Vercel despliegue:

#### Tests Manuales Obligatorios

1. **Login**
   - [ ] Login con Google funciona
   - [ ] Sesión se mantiene al recargar
   - [ ] Logout funciona correctamente

2. **Página de Equipos**
   - [ ] Se cargan los equipos (lectura pública)
   - [ ] Se puede solicitar unirse a un equipo
   - [ ] Se puede cancelar una solicitud

3. **Perfil de Usuario**
   - [ ] Se puede editar el perfil propio
   - [ ] Se pueden subir documentos (comprobantes, apto médico)
   - [ ] Los documentos se pueden descargar

4. **Panel de Admin (SOLO para usuarios admin)**
   - [ ] Acceso solo para usuarios con rol='admin'
   - [ ] Se pueden aprobar/rechazar solicitudes
   - [ ] Se pueden validar pagos
   - [ ] Se pueden validar aptos médicos
   - [ ] Se puede editar información del equipo

5. **Seguridad**
   - [ ] `/api/debug` retorna 404 en producción
   - [ ] Usuario NO-admin NO puede ejecutar operaciones de admin
   - [ ] Usuario NO puede modificar perfil de otro usuario
   - [ ] Uploads validan tipo y tamaño de archivo
   - [ ] Downloads solo sirven archivos propios (o a admin)

---

### 4. Monitoreo Post-Lanzamiento

#### Logs a Monitorear en Vercel

```bash
# Buscar errores críticos
grep -i "BETTER_AUTH_SECRET" logs
grep -i "Unauthorized" logs
grep -i "Forbidden" logs
```

#### Alertas de Seguridad

Configurar alertas para:
- Múltiples intentos de acceso admin fallidos
- Errores de autenticación repetidos
- Uploads rechazados por validación

---

## 🔒 Estado de Seguridad Actual

### Protecciones Implementadas

| Capa | Protección | Estado |
|------|-----------|--------|
| **Autenticación** | Better Auth con Google OAuth | ✅ |
| **Secret** | Validación de BETTER_AUTH_SECRET | ✅ |
| **RLS** | Habilitado en teams/athletes/payments | ⚠️ Pendiente aplicar |
| **Server Actions** | `'use server'` + service role | ✅ |
| **Admin Operations** | `requireAdmin()` en 6 funciones | ✅ |
| **Ownership** | `requireOwnershipOrAdmin()` en updates | ✅ |
| **Uploads** | Validación MIME/size/extension | ✅ |
| **Downloads** | Ownership check | ✅ |
| **Debug Endpoint** | Bloqueado en producción | ✅ |
| **Security Headers** | X-Frame-Options, CSP, etc. | ✅ |
| **Images** | next/image optimizado | ✅ |

### Riesgos Residuales (Post-MVP)

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Rate limiting | Media | Agregar `upstash/ratelimit` |
| CSRF protection | Media | Validar Origin header |
| Session validation en middleware | Baja | Validar sesión en middleware |
| SQL injection | Muy baja | Supabase usa queries parametrizados |

---

## 📋 Procedimiento de Rollback

Si algo falla después del despliegue:

1. **Revertir código:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Revertir migración RLS (si es necesario):**
   ```sql
   ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
   ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
   ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
   ```

3. **Verificar que el servicio se restauró**

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs de Vercel: https://vercel.com/dashboard → tu proyecto → Deployments → Functions
2. Revisar logs de Supabase: Dashboard → Logs
3. Verificar que todas las variables de entorno estén configuradas
4. Validar que la migración RLS se aplicó correctamente

---

## ✅ Sign-off para Producción

- [ ] Variables de entorno configuradas en Vercel
- [ ] BETTER_AUTH_SECRET generado y configurado
- [ ] Migración RLS aplicada en staging
- [ ] Tests manuales en staging exitosos
- [ ] Migración RLS aplicada en producción
- [ ] Tests manuales en producción exitosos
- [ ] Monitoreo configurado
- [ ] Procedimiento de rollback documentado

**Fecha de despliegue:** _______________  
**Responsable:** _______________  
**Aprobado por:** _______________
