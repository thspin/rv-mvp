# AI Agent Guidelines (agents.md)

Welcome, AI Assistant! This document serves as the absolute source of truth for the codebase, architecture, and coding conventions of **rv-mvp**. Follow these rules strictly when implementing features or fixing bugs.

---

## Tech Stack & Key Libraries

*   **Framework**: Next.js 16 (App Router).
*   **Styling**: Tailwind CSS v4 & shadcn/ui (base-nova).
*   **Auth**: Better Auth (Google OAuth) — configuración en [auth.ts](file:///src/lib/auth.ts) y [auth-client.ts](file:///src/lib/auth-client.ts).
*   **Database**: Supabase PostgreSQL (RLS habilitado con políticas por usuario, JWT custom firmado con Supabase JWT Secret).
*   **Storage**: Supabase Storage (uploads vía `/api/storage/upload` con validaciones, bucket privado `backups` para dumps diarios).
*   **Database Interface**: Server-only layer en [db.ts](file:///src/lib/db.ts) usando `createAuthenticatedClient(userId)` para operaciones con RLS y `createServiceClient()` solo para operaciones del sistema (notificaciones, logs, backups, cron). Tipos en [db-types.ts](file:///src/lib/db-types.ts).
*   **App Settings (pricing)**: [settings.ts](file:///src/lib/settings.ts) — `getPricingConfig()` / `updatePricingConfig()` leen y escriben de la tabla `site_settings` (monto mensual, moneda, día de vencimiento). **Nunca hardcodear el valor de la cuota en el código**.
*   **CSRF**: [csrf.ts](file:///src/lib/csrf.ts) — utilitarios de token (doble submit cookie) + el middleware en `middleware.ts` valida `Origin`/`Referer` para todas las mutaciones.
*   **Server Actions**: [actions.ts](file:///src/lib/actions.ts) para operaciones que requieren sesión de Better Auth.
*   **Rate Limiting**: Upstash Redis + @upstash/ratelimit (sliding window). Configurado en [rate-limit.ts](file:///src/lib/rate-limit.ts).
*   **Error Monitoring**: Sentry (browser, server, edge) via @sentry/nextjs. Helpers en [sentry-utils.ts](file:///src/lib/sentry-utils.ts). SDK config en `sentry.{client,server,edge}.config.ts`.
*   **Error Boundaries**: `error.tsx` y `global-error.tsx` por cada ruta (Next.js App Router). Componente reutilizable en [ErrorFallback.tsx](file:///src/components/ErrorFallback.tsx).
*   **Daily Backups**: [backup.ts](file:///src/lib/backup.ts) — dump gzip a Supabase Storage bucket `backups`, rotación 7 días, fusionado con el cron existente (`/api/cron`).
*   **Icons**: Lucide React.
*   **Utility**: `cn()` (clsx + tailwind-merge), `computeNextPaymentDue()` y `formatCurrency()` en [utils.ts](file:///src/lib/utils.ts).
*   **Images**: `next/image` para optimización automática (AVIF/WebP).
*   **Testing**: Vitest (unit + integration), Playwright (E2E). Config en `vitest.config.ts` y `playwright.config.ts`.

---

## CLI Tools Disponibles

Estas herramientas están instaladas y disponibles via `npx`:

*   **Vercel CLI** (`npx vercel`): Para gestión de deployments y variables de entorno.
    *   `npx vercel env add <NAME> <environment>` — Agregar variable de entorno
    *   `npx vercel env ls` — Listar variables de entorno
    *   `npx vercel --prod --yes` — Deploy directo a producción
*   **Supabase CLI** (`npx supabase`): Para gestión de base de datos y migraciones.
    *   Requiere autenticación previa con `npx supabase login`
*   **PostgreSQL** (`pg` module): El paquete `pg` está disponible en `node_modules` para ejecutar queries SQL directamente contra la base de datos.
    *   Útil para ejecutar migraciones SQL cuando no hay acceso a Supabase CLI autenticado.
    *   Crear un archivo temporal `.js` en el directorio del proyecto, ejecutarlo con `node`, y luego eliminarlo.

---

## Project Directory Structure & Boundaries

*   **`src/app/`**: Contains page views and API routes.
    *   `admin/page.tsx`: Dashboard for administrators (Coaches). Tabs: general, equipo, entrenamientos, solicitudes, **atletas (paginado)**, pagos, aptos, historial, **configuracion**.
    *   `dashboard/page.tsx`: Main panel for active athletes.
    *   `equipos/page.tsx`: Directory for exploring and requesting to join teams.
    *   `perfil/page.tsx`: Personal details, emergency contact edits, onboarding.
    *   `api/auth/[...all]/route.ts`: Better Auth catch-all handler.
    *   `api/storage/[bucket]/route.ts`: Secure proxy for downloading storage files via service role credentials.
    *   `api/storage/upload/route.ts`: Upload endpoint con validación MIME/size/extension.
    *   `api/cron/route.ts`: Daily cron (9 AM UTC) — recordatorios de vencimientos de apto médico, **recordatorios de pago (T-7d / T-3d / T-0 / T+1d / T+7d)**, backup automático.
    *   `api/debug/route.ts`: Debug endpoint (bloqueado en producción vía `ENABLE_DEBUG_ENDPOINT`).
    *   `error.tsx`, `global-error.tsx`: Error boundaries de Next.js por ruta.
*   **`src/app/admin/components/`**: Tabs del panel admin.
    *   `configuracion-tab.tsx`: Edición de cuota mensual, moneda y día de vencimiento (admin only).
    *   `atletas-tab.tsx`: Lista paginada de atletas activos (server-side, 20/pág).
*   **`src/components/`**: Reusable component layouts. Put layout items (like navigation) here.
    *   `ErrorFallback.tsx`: UI reutilizable para error boundaries (botón reintentar + detalles técnicos en dev).
    *   `SentryUserProvider.tsx`: Client component que setea el user context de Sentry automáticamente.
    *   `NotificationBell.tsx`: Campana con badge rojo animado y contador de no-leídas. Hace polling cada 30s.
    *   `ui/pagination.tsx`: Componente de paginación shadcn-style (sin cards, botones planos).
*   **`src/lib/`**:
    *   `auth.ts`: Better Auth server instance (PostgreSQL + Google OAuth + nextCookies plugin).
    *   `auth-client.ts`: Better Auth client instance (`createAuthClient` from `better-auth/react`).
    *   `actions.ts`: Server actions that require Better Auth session (e.g., `getCurrentUserAction`).
    *   `db.ts`: All database transactions (Teams, Athletes, Payments, Reminders). **Always modify database queries here, not inside client pages.** Incluye `getPaginatedAthletesByTeamStatusAsync()` para server-side paging y `checkUpcomingPaymentDues()` para el cron.
    *   `settings.ts`: Pricing config (`getPricingConfig`, `updatePricingConfig`). Lee/escribe `site_settings`. **Toda la UI debe leer el monto de acá, no hardcodearlo**.
    *   `csrf.ts`: Utilidades de token CSRF (doble submit cookie). `assertCsrfFromRequest()` se aplica en endpoints `/api/*` que mutan.
    *   `errors.ts`: Clases de error personalizadas (`RateLimitError` con `code: 'RATE_LIMITED'`).
    *   `rate-limit.ts`: Rate limiting via Upstash — `rateLimitMiddleware()` para Edge y `rateLimitAction()` para server actions. Fallback graceful si Upstash no está configurado.
    *   `backup.ts`: Daily database backup — `createBackup()` (paralelo + gzip) y `cleanOldBackups()` (rotación 7 días). Se ejecuta desde `/api/cron`.
    *   `sentry-utils.ts`: Helpers de Sentry — `setUserContext()` y `addBreadcrumb()`.
    *   `supabase/client.ts`: Browser anon client (solo para Storage uploads).
    *   `supabase/service.ts`: Server-side service role client (solo para operaciones del sistema: createNotification, logActivityAsync, backup, cron reminders).
    *   `supabase/authenticated.ts`: Server-side authenticated client que firma JWT custom con SUPABASE_JWT_SECRET para que RLS use `auth.uid()` del Better Auth user.
*   **`middleware.ts`**: Next.js middleware (Edge runtime) — rate limiting por IP+path para `/api/*` + protección de sesión con `getSessionCookie` + **validación de `Origin`/`Referer` para todos los métodos no seguros (POST/PUT/PATCH/DELETE)**. Excluye `/api/auth`, `/api/storage/*` y `/api/cron` del check de sesión/CSRF.
*   **`next.config.ts`**: Envuelto con `withSentryConfig()` (tunnelRoute, sourcemaps deshabilitados, automaticVercelMonitors). Headers de seguridad: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` (solo en prod).
*   **`instrumentation.ts`**: Hook de Next.js 15+ que inicializa Sentry server/edge según `NEXT_RUNTIME`.
*   **`sentry.{client,server,edge}.config.ts`**: Config de Sentry por runtime. Solo se inicializa si `NEXT_PUBLIC_SENTRY_DSN` está presente.
*   **`schema.sql`**: Database structure including Better Auth tables (user, session, account, verification) and application tables. If you modify database fields or add tables, update this file too.

---

## Database & Security Model

La autenticación se maneja con **Better Auth** (Google OAuth). Las sesiones se validan con `auth.api.getSession()` en el servidor.

RLS está **habilitado** en todas las tablas de aplicación (`teams`, `athletes`, `payments`, `notifications`, `activity_logs`, **`site_settings`**, **`payment_reminder_log`**) con políticas que usan `auth.uid()` del JWT custom firmado con `SUPABASE_JWT_SECRET`.

### Arquitectura de clientes Supabase

```
db.ts
├── createAuthenticatedClient(userId)  ← JWT custom firmado con Supabase JWT Secret
│   └── RLS policies usan auth.uid() que retorna el Better Auth user ID
│   └── Para operaciones del propio usuario (leer/perfil, actualizar, notificaciones)
│
└── createServiceClient()              ← SOLO para:
    ├── createNotification (inserta para otros usuarios)
    └── logActivityAsync (inserta logs del sistema)
```

### Variables de entorno requeridas

**Core (Supabase + Auth):**
- `SUPABASE_JWT_SECRET` — JWT Secret de Supabase (Dashboard > Settings > API > JWT Secret)
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key pública
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (solo para createNotification, logActivityAsync y backup)
- `DATABASE_URL` — Connection string de Postgres (usado por `pg` para backups directos)
- `BETTER_AUTH_SECRET` — Secret para Better Auth (generar con `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth de Google
- `CRON_SECRET` — Secret para proteger `/api/cron` (generar con `openssl rand -hex 32`)

**Rate Limiting (Upstash — opcional, fallback graceful si falta):**
- `UPSTASH_REDIS_REST_URL` — URL del Redis de Upstash
- `UPSTASH_REDIS_REST_TOKEN` — Token de Upstash

**Error Monitoring (Sentry — opcional, fallback graceful si falta):**
- `NEXT_PUBLIC_SENTRY_DSN` — DSN público de Sentry (browser + server)
- `SENTRY_ORG` — Slug de organización (opcional, para source maps)
- `SENTRY_PROJECT` — Slug del proyecto (opcional, para source maps)
- `SENTRY_AUTH_TOKEN` — Auth token (opcional, para subir source maps en build)

### Políticas RLS
- **teams**: Lectura para authenticated, solo admin puede modificar
- **athletes**: Ver/actualizar tu perfil o ser admin; crear solo tu registro; solo admin elimina
- **payments**: Ver tus pagos o ser admin; solo admin inserta/modifica/elimina
- **notifications**: Ver/actualizar solo tus notificaciones; admin puede insertar
- **activity_logs**: Solo admin lee e inserta
- **site_settings**: Lectura para authenticated, solo admin inserta/actualiza
- **payment_reminder_log**: Solo admin lee; inserts los hace `service_role` desde el cron

### Función helper is_admin()
`is_admin(check_user_id TEXT)` — `SECURITY DEFINER` con `SET search_path = ''` para evitar recursión infinita en políticas RLS.

**Rules for AI Assistants:**
1.  Para verificar sesión de usuario, usar `getCurrentUserAction()` de `@/lib/actions` (server action) o `authClient.useSession()` de `@/lib/auth-client` (client hook).
2.  Para operaciones de base de datos en `db.ts`, usar `createAuthenticatedClient(session.user.id)` — NUNCA `createServiceClient()` excepto para `createNotification` y `logActivityAsync`.
3.  No usar `@supabase/ssr` — fue reemplazado por Better Auth.
4.  **Todos los uploads deben pasar por `/api/storage/upload`** — nunca subir directamente con el anon client desde el browser.
5.  **db.ts tiene `'use server'`** — todas las funciones son server actions. Tipos y funciones puras están en `db-types.ts`.
6.  Si una operación requiere descargar archivos, implementar via API route usando `createServiceClient()` de `@/lib/supabase/service` (verifica ownership antes de servir).

---

## Image Optimization Guidelines

### Reglas obligatorias al agregar imágenes

1.  **Siempre usar `next/image`** en lugar de `<img>` para todas las imágenes.
    ```tsx
    import Image from 'next/image';
    
    // Para imágenes con dimensiones conocidas
    <Image src="/logo.png" alt="Logo" width={200} height={100} />
    
    // Para imágenes que llenan un contenedor
    <Image src="/hero.jpg" alt="Hero" fill className="object-cover" />
    ```

2.  **Formatos recomendados** (en orden de preferencia):
    *   **AVIF** — Mejor compresión, soportado en browsers modernos
    *   **WebP** — Buen balance compresión/calidad, amplio soporte
    *   **PNG** — Solo para imágenes que necesiten transparencia
    *   **JPG** — Solo para fotos donde AVIF/WebP no estén disponibles

3.  **Remote patterns configurados** en `next.config.ts`:
    *   `*.supabase.co` — Para archivos de Supabase Storage
    *   `lh3.googleusercontent.com` — Para avatares de Google OAuth
    
    Si necesitas agregar un nuevo dominio remoto, actualiza `remotePatterns` en `next.config.ts`.

4.  **Tamaños de imágenes**:
    *   Avatares: 200x200px máximo
    *   Logos de equipos: 400x400px máximo
    *   Fondos/hero: 1920x1080px máximo
    *   Thumbnails: 300x300px máximo

5.  **Optimización de archivos**:
    *   Usar herramientas como TinyPNG, Squoosh, o ImageOptim antes de subir imágenes estáticas
    *   Para imágenes dinámicas (uploads de usuarios), el upload route handler valida:
        *   Tamaño máximo: 5MB
        *   Tipos permitidos: image/jpeg, image/png, image/webp, image/gif, application/pdf
        *   Extensiones: jpg, jpeg, png, webp, gif, pdf

6.  **No usar fondos decorativos pesados**. Si se necesita un fondo, usar:
    *   Gradientes CSS (preferido)
    *   SVGs inline para patrones
    *   Imágenes optimizadas en WebP/AVIF con lazy loading

7.  **Placeholders**: Para imágenes que cargan async, usar el prop `placeholder="blur"` con `blurDataURL` para evitar layout shift.

---

## Coding Style & Rules

1.  **Strict Typing**: Always type function parameters, states, and return values using interface contracts in `src/lib/db-types.ts`.
2.  **No Direct Supabase Calls in Pages**: Do not use `supabase.from(...)` directly inside page files for core database transactions. Write a helper function in [db.ts](file:///src/lib/db.ts) and call it from the page instead.
3.  **Translations**: The app UI must be entirely in **Spanish** (`es-AR`).
4.  **Error Handling**: Wrap database operations in `try-catch` blocks and log descriptive error outputs. Keep UI states interactive during loading.
5.  **Auth**: Para verificar sesión en client components usar `authClient.useSession()` de `@/lib/auth-client`. Para server actions usar `getCurrentUserAction()` de `@/lib/actions`.
6.  **Storage uploads**: Siempre usar el route handler `/api/storage/upload` — nunca subir directamente con el anon client desde el browser.
7.  **Images**: Siempre usar `next/image` en lugar de `<img>`. Ver sección "Image Optimization Guidelines" más abajo.
8.  **Column Projection**: En queries de Supabase, especificar las columnas necesarias en lugar de `select('*')`. Usar las constantes `TEAM_COLUMNS`, `ATHLETE_COLUMNS`, `PAYMENT_COLUMNS` definidas en `db.ts`.

---

## Testing

### Framework & Tools

*   **Unit & Integration Tests**: Vitest + @testing-library/react + jsdom
*   **E2E Tests**: Playwright
*   **Configuration**: `vitest.config.ts` (alias `@/` -> `./src/`, environment `jsdom`)

### Test Commands

```bash
npm test                    # Run all unit + integration tests
npm run test:watch          # Watch mode for development
npm run test:unit           # Run only unit tests (src/__tests__/unit/)
npm run test:integration    # Run only integration tests (src/__tests__/integration/)
npm run test:e2e            # Run E2E tests (requires dev server)
npm run test:e2e:install    # Install Playwright browsers
```

### Test File Locations

*   **Unit Tests**: `src/__tests__/unit/` — Pure functions (utils.ts, db-types.ts)
*   **Integration Tests**: `src/__tests__/integration/` — Server actions, API routes, db.ts functions
*   **E2E Tests**: `e2e/` — Full user flows (Playwright)

### Mocking Strategy

For integration tests, mock external dependencies:

```typescript
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))
```

### Rules for AI Assistants

1.  **Run tests before committing**: Execute `npm test` to verify all tests pass.
2.  **Add tests for new logic**: When adding pure functions to `utils.ts` or `db-types.ts`, add corresponding unit tests.
3.  **Add integration tests for new server actions**: When adding functions to `db.ts` or `actions.ts`, add integration tests with mocked Supabase.
4.  **E2E tests for critical flows**: Only add E2E tests for user-facing flows that cannot be covered by integration tests.
5.  **Do not mock in unit tests**: Unit tests should test pure functions without mocks.

---

## Flujo de Verificacion y Despliegue

1.  **Ejecutar tests**: Antes de cualquier commit, ejecutar `npm test` para verificar que todos los tests unitarios e integration pasen.
2.  **Verificacion local sin servidor**: Para validar que los cambios de codigo no rompan la aplicacion y evitar errores de TypeScript, ejecuta `npm run build` en local. No es necesario levantar un servidor de desarrollo local (`npm run dev`) ni configurar credenciales locales de Supabase (`.env.local`), a menos que sea estrictamente necesario para depurar algun error especifico de la integracion.
3.  **Pruebas funcionales**: La verificacion visual y funcional final se realiza directamente en el entorno de Staging/Produccion provisto por Vercel una vez que los cambios se suben a GitHub.

4.  **Commit & Push automático**: Después de cualquier cambio en el código, el agente debe hacer `git add -A`, `git commit` y `git push origin main` automáticamente para que Vercel despliegue.

5.  **Despliegue manual de contingencia**: En caso de que el webhook de GitHub no dispare el despliegue automático en Vercel (o si no se actualiza después de unos minutos), el agente debe ejecutar `npx vercel --prod --yes` para forzar un despliegue directo a producción desde la terminal.

---

## Installed Skills

Skills are located in `.agents/skills/`. Reference them when working on relevant tasks.

### Framework & Runtime

| Skill | Source | When to use |
|-------|--------|-------------|
| `next-best-practices` | vercel-labs | File conventions, RSC boundaries, async APIs, metadata, error handling |
| `next-cache-components` | vercel-labs | PPR, `use cache` directive, `cacheLife()`, `cacheTag()` |
| `next-upgrade` | vercel-labs | Migrating between Next.js versions |
| `react-best-practices` | vercel-labs | Rendering performance, bundle efficiency, component architecture |
| `composition-patterns` | vercel-labs | Compound components, lifted state, React 19 `use()` API |

### Styling & UI

| Skill | Source | When to use |
|-------|--------|-------------|
| `shadcn` | shadcn-ui | Searching, adding, composing shadcn/ui components |
| `baseline-ui` | ibelick | Enforcing Tailwind conventions, animation rules, layout anti-patterns |
| `tailwind-css-patterns` | community | Responsive design, layout, flexbox/grid, dark mode |
| `tailwind-v4-shadcn` | community | Tailwind v4 + shadcn/ui integration, CSS variable architecture |
| `interface-design` | Dammyjay93 | Dashboard/admin panel design craft, consistency, system.md |
| `frontend-design` | anthropics | Production-grade UI that avoids generic AI aesthetics |

### Accessibility

| Skill | Source | When to use |
|-------|--------|------------|
| `accessibility` | addyosmani | WCAG 2.2 audit, POUR rules, keyboard nav |
| `fixing-accessibility` | ibelick | Targeted ARIA, focus, contrast, and form error fixes |

### Database & Backend

| Skill | Source | When to use |
|-------|--------|------------|
| `supabase-postgres-best-practices` | supabase | Query performance, RLS security, schema design |

### Quality & SEO

| Skill | Source | When to use |
|-------|--------|------------|
| `seo` | addyosmani | Crawlability, meta tags, structured data, sitemaps |
| `typescript-advanced-types` | wshobson | Generics, conditional types, mapped types, type-safe patterns |

---

## Rate Limiting

El proyecto tiene rate limiting en 2 capas:

### Capa 1: Middleware (Edge)
- `/api/auth/*` — 20 req/min por IP
- `/api/storage/upload` — 5 req/min por IP
- `/api/storage/*` (downloads) — 30 req/min por IP
- Otras `/api/*` — 60 req/min por IP
- `rateLimitMiddleware()` retorna `NextResponse` con status 429 + headers `Retry-After` y `X-RateLimit-*`

### Capa 2: Server Actions

| Función | Límite | Ventana | Prefix Upstash |
|---------|--------|---------|----------------|
| `requestJoinTeamAction` / `leaveTeamAction` | 5 | 1 min | `rl:action:joinTeam`, `rl:action:leaveTeam` |
| `uploadPaymentReceiptAsync` | 10 | 5 min | `rl:action:uploadReceipt` |
| `uploadMedicalCertificateAsync` | 10 | 5 min | `rl:action:uploadMedicalCert` |
| `completeOnboardingAsync` | 20 | 5 min | `rl:action:completeOnboarding` |
| `getAthletesAsync` | 60 | 1 min | `rl:action:getAthletes` |
| `getPaymentsAsync` | 30 | 1 min | `rl:action:getPayments` |

Cada server action tiene su propio prefix en Upstash (`rl:action:${actionName}`) para buckets independientes. Si Upstash no está configurado, todas las requests pasan (warning en consola).

**Importante**: NO agregar rate limiting a funciones internas (ej. `updateAthleteProfileAsync`) porque son llamadas por admin operations y afectaría el flujo admin.

---

## Error Monitoring (Sentry)

- **Browser**: errores del cliente + user context automático via `SentryUserProvider`
- **Server**: errores de server actions / API routes (capturados automáticamente por el SDK)
- **Edge**: errores del middleware (rate limiter, session check)

Cada `error.tsx` llama `Sentry.captureException(error, { tags: { source: 'ruta' } })` con tag de origen (`root`, `dashboard`, `equipos`, `perfil`, `admin`, `global-error`).

**Tags disponibles en Sentry dashboard:**
- `source`: ruta donde ocurrió el error
- `function`: nombre de la función (ej. `createBackup`)

---

## Daily Backups

- **Schedule**: 9 AM UTC (6 AM Argentina) via cron existente en `/api/cron`
- **Storage**: bucket `backups` (privado) en Supabase Storage
- **Formato**: `backup-YYYY-MM-DD.json.gz` (gzip reduce ~70%)
- **Tablas**: 8 tablas (user, account, session, verification, teams, athletes, payments, notifications). `activity_logs` está excluido por tamaño.
- **Retención**: 7 días (`cleanOldBackups()` rota automáticamente)
- **Sin segundo cron**: Vercel Free solo permite 2 crons, se fusionó con el de notificaciones de vencimientos.

Si el backup falla, Sentry captura la excepción con tag `source: 'backup-cron'`.

**Restauración** (manual, no hay script automático):
1. Descargar `.json.gz` del bucket
2. Descomprimir con `gunzip`
3. Limpiar tablas destino
4. Insertar filas respetando orden de FKs (ver `TABLAS` en `src/lib/backup.ts`)

---

## Supabase Storage Buckets

| Bucket | Acceso | Propósito |
|--------|--------|-----------|
| `receipts` | Privado | Comprobantes de pago subidos por atletas |
| `medical-certs` | Privado | Aptos médicos subidos por atletas |
| `avatars` | Privado | Avatares de usuario |
| `documents` | Privado | Documentos de identidad |
| `backups` | Privado | Dumps diarios automáticos de la DB (gzip) |

**Importante**: Todos los buckets son privados. El acceso desde el cliente siempre pasa por `/api/storage/[bucket]` (downloads con ownership check) o `/api/storage/upload` (uploads con validación). Nunca exponer URLs públicas de Supabase Storage.

---

## Site Settings (single-tenant pricing)

El MVP es de un solo club. La configuración de facturación vive en la tabla `site_settings` (key-value JSONB), no en `teams`, para que el admin pueda cambiar el monto sin redeploy.

**Keys actuales:**
- `monthly_fee` (number) — valor de la cuota mensual.
- `currency` (`'ARS' | 'USD' | 'EUR' | 'BRL'`) — moneda por defecto.
- `payment_due_day` (1-28) — día del mes en que vence la cuota.

**Acceso desde el código:**
```ts
import { getPricingConfig, updatePricingConfig } from '@/lib/settings'

// Server actions / server components
const pricing = await getPricingConfig() // { amount, currency, dueDay }

// UI admin (solo admins)
await updatePricingConfig({ amount: 20000, currency: 'ARS', dueDay: 5 })
```

**Reglas:**
1. **NUNCA hardcodear el monto de la cuota** en componentes. Leer siempre de `getPricingConfig()`.
2. Si `site_settings` no tiene la key, `getPricingConfig()` retorna `PRICING_DEFAULTS` (definido en `db-types.ts`).
3. Al aprobar un pago, `db.ts` recalcula automáticamente `next_payment_due` basado en `payment_due_day`.
4. La UI de edición vive en `src/app/admin/components/configuracion-tab.tsx` y se accede desde la tab "Configuracion" del admin panel.
5. La migración inicial está en `supabase/migrations/005_site_settings.sql`. La tabla está reflejada en `schema.sql`.

---

## Payment Reminders (cron de cuota)

`checkUpcomingPaymentDues()` corre diariamente en `/api/cron` (9 AM UTC = 6 AM Argentina) y envía notificaciones in-app a los atletas activos con pago pendiente:

| Tipo | Cuándo | Mensaje |
|------|--------|---------|
| `pre_due_7d` | 7 días antes del vencimiento | "Tu cuota mensual vence el {fecha}..." |
| `pre_due_3d` | 3 días antes | "Recordatorio: tu cuota vence en 3 días..." |
| `due_today`  | Día del vencimiento | "Hoy vence tu cuota. Subí tu comprobante..." |
| `overdue_1d` | 1 día vencido | "Tu cuota está vencida. Regularizá tu pago..." |
| `overdue_7d` | 7 días vencido | "Cuota vencida hace 7 días. Si no regularizás..." |

**Idempotencia:** la tabla `payment_reminder_log` tiene `UNIQUE(athlete_id, reminder_type, sent_at::date)`. Si el cron corre más de una vez por día, no se duplican las notificaciones. Constraint `23505` (unique violation) → se ignora silenciosamente.

**Mora:** si el atleta está vencido, se actualiza `mora_months = |daysLeft|` (cap a 99) y `payment_status = 'Vencido'`. Esto le da al admin visibilidad de cuántos meses debe.

**Reset de `next_payment_due`:** al aprobar/condonar un pago, se setea `last_payment_date = now()` y `next_payment_due = computeNextPaymentDue(now, pricing.dueDay)`. Al activar un atleta (`updateAthleteTeamStatus → 'activo'`), se inicializa `next_payment_due` al próximo día de vencimiento.

**Migración:** `supabase/migrations/004_payment_due.sql`. Reflejada en `schema.sql`.

---

## CSRF Protection

La app usa 2 capas de defensa contra CSRF:

### Capa 1: Origin/Referer validation (middleware)
- `src/middleware.ts` valida que toda request con método no seguro (POST, PUT, PATCH, DELETE) venga del mismo origen (`NEXT_PUBLIC_APP_URL` o `VERCEL_URL`).
- Si el `Origin` (o `Referer` como fallback) no está en la lista de orígenes permitidos, retorna 403.
- Excluye del check: `/api/auth/*`, `/api/storage/*`, `/api/cron` (los uploads/downloads tienen sus propios auth checks; el cron usa `Authorization: Bearer`).

### Capa 2: doble submit cookie (defensa en profundidad)
- `src/lib/csrf.ts` exporta `getOrIssueCsrfToken()`, `assertCsrfToken()`, `assertCsrfFromRequest()`.
- Cookie httpOnly `__Host-csrf-token` con 32 bytes random (base64url).
- Para endpoints `/api/*` que muten, se puede aplicar `assertCsrfFromRequest(request)` que compara el header `X-CSRF-Token` contra la cookie.
- Los server actions de Next 15 ya están protegidos por same-origin + action ID, por lo que la Capa 1 es suficiente para el grueso.

### Headers de seguridad (`next.config.ts`)
- `X-Frame-Options: DENY` (anti clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (solo en producción)

### Auditoría de contraseñas
- Better Auth hashea las contraseñas con scrypt por default. Nunca se exponen en queries (verificado: 0 matches de `password` en `src/`).
- Al agregar nuevas pantallas que listen usuarios, **NO incluir el campo de password en la proyección**. Usar solo `ATHLETE_COLUMNS` (que ya lo excluye).

---

## Pagination (atletas)

El tab "Atletas" del admin está paginado server-side para evitar que 200+ atletas rendericen al mismo tiempo.

**Implementación:**
- `db.ts` exporta `getPaginatedAthletesByTeamStatusAsync(status, { page, pageSize })` que usa `range(from, to)` + `count: 'exact'` de Supabase.
- Default `pageSize = 20`, max `100`.
- `AtletasTab` recibe `page`, `pageSize`, `total`, `onPageChange` y renderiza `<Pagination />`.
- El sidebar del admin sigue mostrando el total real (via `getAllAthletes()` cargado en `loadData()`).

**Componente UI:** `src/components/ui/pagination.tsx` — botones planos shadcn-style (sin cards, sin gradientes), con elipsis para listas grandes, accesible (`aria-label`, `aria-current`).

**Para agregar paginación a otro tab:**
1. Agregar helper `getPaginatedXxxAsync(opts)` en `db.ts` que use `.range(from, to)` + `.select(..., { count: 'exact' })`.
2. El componente del tab debe recibir `page`, `pageSize`, `total`, `onPageChange` y renderizar `<Pagination />` al final.
3. El state `page` debe estar en el padre (admin/page.tsx) para persistir entre re-renders.

---

## Design Restraint (cards/gradients)

Reglas de diseño limpio (siguiendo el feedback "no abusar de cards ni degradados"):

1. **Evitar `<Card>` envueltas cuando la info ya tiene su contenedor natural** (tabla, lista, modal).
2. **No usar gradientes de fondo** (`bg-gradient-to-*`) salvo en hero/banner principal. Para separaciones usar `border-border` + `bg-muted/30`.
3. **Una sombra por elemento** como máximo (`shadow-sm`). Nunca combinar `shadow-md` + `shadow-lg` + gradiente.
4. **Espacio en blanco generoso**: `p-6` o `p-8` para cards importantes, `gap-4` a `gap-6` entre elementos.
5. **Inputs y botones** sin envolturas decorativas — usar los primitives de `src/components/ui/` directamente.
6. **Badges** para estado (`StatusBadge`, `PaymentBadge`) en lugar de cards chicas coloreadas.

**Bueno (clean):** tabla con `<Pagination />` al pie, modales con `bg-card` sólido, secciones con título + descripción + acción al final.

**Evitar:** grids de 4 cards con iconos grandes y sombras pesadas solo para mostrar 1 número; KPIs deberían ser texto + número en una sola línea si el espacio lo permite.
