# AI Agent Guidelines (agents.md)

Welcome, AI Assistant! This document serves as the absolute source of truth for the codebase, architecture, and coding conventions of **rv-mvp**. Follow these rules strictly when implementing features or fixing bugs.

---

## Tech Stack & Key Libraries

*   **Framework**: Next.js 16 (App Router).
*   **Styling**: Tailwind CSS v4 & shadcn/ui.
*   **Auth**: Better Auth (Google OAuth) — configuración en [auth.ts](file:///src/lib/auth.ts) y [auth-client.ts](file:///src/lib/auth-client.ts).
*   **Database**: Supabase PostgreSQL (RLS habilitado con políticas por usuario, JWT custom firmado con Supabase JWT Secret).
*   **Storage**: Supabase Storage (uploads vía `/api/storage/upload` con validaciones).
*   **Database Interface**: Server-only layer en [db.ts](file:///src/lib/db.ts) usando `createAuthenticatedClient(userId)` para operaciones con RLS y `createServiceClient()` solo para operaciones del sistema (notificaciones, logs). Tipos en [db-types.ts](file:///src/lib/db-types.ts).
*   **Server Actions**: [actions.ts](file:///src/lib/actions.ts) para operaciones que requieren sesión de Better Auth.
*   **Icons**: Lucide React.
*   **Utility**: `cn()` (clsx + tailwind-merge) for class composition.
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
    *   `admin/page.tsx`: Dashboard for administrators (Coaches).
    *   `dashboard/page.tsx`: Main panel for active athletes.
    *   `equipos/page.tsx`: Directory for exploring and requesting to join teams.
    *   `perfil/page.tsx`: Personal details, emergency contact edits, onboarding.
    *   `api/auth/[...all]/route.ts`: Better Auth catch-all handler.
    *   `api/storage/[bucket]/route.ts`: Secure proxy for downloading storage files via service role credentials.
*   **`src/components/`**: Reusable component layouts. Put layout items (like navigation) here.
*   **`src/lib/`**:
    *   `auth.ts`: Better Auth server instance (PostgreSQL + Google OAuth + nextCookies plugin).
    *   `auth-client.ts`: Better Auth client instance (`createAuthClient` from `better-auth/react`).
    *   `actions.ts`: Server actions that require Better Auth session (e.g., `getCurrentUserAction`).
    *   `db.ts`: All database transactions (Teams, Athletes, Payments). **Always modify database queries here, not inside client pages.**
    *   `supabase/client.ts`: Browser anon client (solo para Storage uploads).
    *   `supabase/service.ts`: Server-side service role client (solo para operaciones del sistema: createNotification, logActivityAsync).
    *   `supabase/authenticated.ts`: Server-side authenticated client que firma JWT custom con SUPABASE_JWT_SECRET para que RLS use `auth.uid()` del Better Auth user.
*   **`proxy.ts`**: Next.js 16 proxy (reemplaza middleware.ts) — protección de rutas con `getSessionCookie`.
*   **`schema.sql`**: Database structure including Better Auth tables (user, session, account, verification) and application tables. If you modify database fields or add tables, update this file too.

---

## Database & Security Model

La autenticación se maneja con **Better Auth** (Google OAuth). Las sesiones se validan con `auth.api.getSession()` en el servidor.

RLS está **habilitado** en todas las tablas de aplicación (`teams`, `athletes`, `payments`, `notifications`, `activity_logs`) con políticas que usan `auth.uid()` del JWT custom firmado con `SUPABASE_JWT_SECRET`.

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
- `SUPABASE_JWT_SECRET` — JWT Secret de Supabase (Dashboard > Settings > API > JWT Secret)
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key pública
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (solo para createNotification y logActivityAsync)

### Políticas RLS
- **teams**: Lectura para authenticated, solo admin puede modificar
- **athletes**: Ver/actualizar tu perfil o ser admin; crear solo tu registro; solo admin elimina
- **payments**: Ver tus pagos o ser admin; solo admin inserta/modifica/elimina
- **notifications**: Ver/actualizar solo tus notificaciones; admin puede insertar
- **activity_logs**: Solo admin lee e inserta

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
|-------|--------|-------------|
| `accessibility` | addyosmani | WCAG 2.2 audit, POUR principles, keyboard nav |
| `fixing-accessibility` | ibelick | Targeted ARIA, focus, contrast, and form error fixes |

### Database & Backend

| Skill | Source | When to use |
|-------|--------|-------------|
| `supabase-postgres-best-practices` | supabase | Query performance, RLS security, schema design |

### Quality & SEO

| Skill | Source | When to use |
|-------|--------|-------------|
| `seo` | addyosmani | Crawlability, meta tags, structured data, sitemaps |
| `typescript-advanced-types` | wshobson | Generics, conditional types, mapped types, type-safe patterns |
