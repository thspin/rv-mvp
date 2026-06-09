# AI Agent Guidelines (agents.md)

Welcome, AI Assistant! This document serves as the absolute source of truth for the codebase, architecture, and coding conventions of **rv-mvp**. Follow these rules strictly when implementing features or fixing bugs.

---

## Tech Stack & Key Libraries

*   **Framework**: Next.js 16 (App Router).
*   **Styling**: Tailwind CSS v4 & shadcn/ui.
*   **Auth**: Better Auth (Google OAuth) — configuración en [auth.ts](file:///src/lib/auth.ts) y [auth-client.ts](file:///src/lib/auth-client.ts).
*   **Database**: Supabase PostgreSQL (RLS desactivado, autorización en capa de aplicación).
*   **Storage**: Supabase Storage (anon key del browser para uploads).
*   **Database Interface**: Local proxy layer in [db.ts](file:///src/lib/db.ts) wrapping the browser anon client.
*   **Server Actions**: [actions.ts](file:///src/lib/actions.ts) para operaciones que requieren sesión de Better Auth.
*   **Icons**: Lucide React.
*   **Utility**: `cn()` (clsx + tailwind-merge) for class composition.

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
    *   `supabase/service.ts`: Server-side service role client (para API routes y server actions).
*   **`proxy.ts`**: Next.js 16 proxy (reemplaza middleware.ts) — protección de rutas con `getSessionCookie`.
*   **`schema.sql`**: Database structure including Better Auth tables (user, session, account, verification) and application tables. If you modify database fields or add tables, update this file too.

---

## Database & Security Model

La autenticación se maneja con **Better Auth** (Google OAuth). Las sesiones se validan con `auth.api.getSession()` en el servidor.

RLS está **desactivado** en las tablas de aplicación (`teams`, `athletes`, `payments`). La autorización se maneja en la capa de aplicación:
*   El anon key del browser se usa solo para Storage uploads.
*   Las queries de `db.ts` usan el anon client (RLS desactivado, sin riesgo).
*   Las operaciones privilegiadas (descarga de archivos, server actions) usan el service role client.

**Rules for AI Assistants:**
1.  Para verificar sesión de usuario, usar `getCurrentUserAction()` de `@/lib/actions` (server action) o `authClient.useSession()` de `@/lib/auth-client` (client hook).
2.  Si una operación requiere elevated privileges (como descargar archivos), implementar via API route o Server Action usando `createServiceClient()` de `@/lib/supabase/service`.
3.  No usar `@supabase/ssr` — fue reemplazado por Better Auth.

---

## Coding Style & Rules

1.  **Strict Typing**: Always type function parameters, states, and return values using interface contracts in `src/lib/db.ts` or `src/types/`.
2.  **No Direct Supabase Calls in Pages**: Do not use `supabase.from(...)` directly inside page files for core database transactions. Write a helper function in [db.ts](file:///src/lib/db.ts) and call it from the page instead.
3.  **Translations**: The app UI must be entirely in **Spanish** (`es-AR`).
4.  **Error Handling**: Wrap database operations in `try-catch` blocks and log descriptive error outputs. Keep UI states interactive during loading.
5.  **Auth**: Para verificar sesión en client components usar `authClient.useSession()` de `@/lib/auth-client`. Para server actions usar `getCurrentUserAction()` de `@/lib/actions`.
6.  **Storage uploads**: Usar `createClient()` de `@/lib/supabase/client` (anon key) solo para uploads de Supabase Storage desde el browser.

---

## Flujo de Verificacion y Despliegue

1.  **Verificacion local sin servidor**: Para validar que los cambios de codigo no rompan la aplicacion y evitar errores de TypeScript, ejecuta `npm run build` en local. No es necesario levantar un servidor de desarrollo local (`npm run dev`) ni configurar credenciales locales de Supabase (`.env.local`), a menos que sea estrictamente necesario para depurar algun error especifico de la integracion.
2.  **Pruebas funcionales**: La verificacion visual y funcional final se realiza directamente en el entorno de Staging/Produccion provisto por Vercel una vez que los cambios se suben a GitHub.

3.  **Commit & Push automático**: Después de cualquier cambio en el código, el agente debe hacer `git add -A`, `git commit` y `git push origin main` automáticamente para que Vercel despliegue.

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
