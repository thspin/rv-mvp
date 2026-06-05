# AI Agent Guidelines (agents.md)

Welcome, AI Assistant! This document serves as the absolute source of truth for the codebase, architecture, and coding conventions of **rv-mvp**. Follow these rules strictly when implementing features or fixing bugs.

---

## 🛠️ Tech Stack & Key Libraries

*   **Framework**: Next.js 15 (App Router).
*   **Styling**: Tailwind CSS & shadcn/ui.
*   **Database & Auth**: Supabase (PostgreSQL with RLS + Storage buckets).
*   **Database Interface**: Local proxy layer in [db.ts](file:///src/lib/db.ts) wrapping the browser client.
*   **Icons**: Lucide React.

---

## 📂 Project Directory Structure & Boundaries

*   **`src/app/`**: Contains page views and API routes.
    *   `admin/page.tsx`: Dashboard for administrators (Coaches).
    *   `dashboard/page.tsx`: Main panel for active athletes.
    *   `equipos/page.tsx`: Directory for exploring and requesting to join teams.
    *   `onboarding/page.tsx`: Profile completion form for new members.
    *   `perfil/page.tsx`: Personal details and emergency contact edits.
    *   `api/storage/[bucket]/route.ts`: Secure proxy for downloading storage files via service role credentials.
    *   `auth/callback/route.ts`: OAuth redirect exchange.
*   **`src/components/`**: Reusable component layouts. Put layout items (like navigation) here.
*   **`src/lib/`**:
    *   `db.ts`: All database transactions (Teams, Athletes, Payments). **Always modify database queries here, not inside client pages.**
    *   `supabase/`: Split client/server/middleware configurations.
*   **`schema.sql`**: Database structure. If you modify database fields or add tables, update this file too.

---

## 🔐 Database & Security Model

This app relies on **Supabase Row Level Security (RLS)**.
*   `teams`: Anyone authenticated can read (`SELECT`). Only administrators (`is_admin()`) can modify.
*   `athletes`: Users can read/write (`SELECT/UPDATE`) only their own record (matching `user_id = auth.uid()`). Administrators can read/write all records.
*   `payments`: Users can read their own logs. Administrators can read/write all records.

**Rules for AI Assistants:**
1.  **Do not bypass RLS** on the client side.
2.  If an operation requires elevated privileges (like downloading files or system updates), implement it via a secure Next.js API route or Server Action using the server-side Supabase client with the service role key.
3.  Always check user session validity using `getCurrentUserAsync` or `createClient` from `@/lib/supabase/server`.

---

## 📝 Coding Style & Rules

1.  **Strict Typing**: Always type function parameters, states, and return values using interface contracts in `src/lib/db.ts` or `src/types/`.
2.  **No Direct Supabase Calls in Pages**: Do not use `supabase.from(...)` directly inside page files for core database transactions. Write a helper function in [db.ts](file:///src/lib/db.ts) and call it from the page instead.
3.  **Translations**: The app UI must be entirely in **Spanish** (`es-AR`).
4.  **Error Handling**: Wrap database operations in `try-catch` blocks and log descriptive error outputs. Keep UI states interactive during loading.
5.  **State Upgrades**: If you modify `db.ts`, make sure to update both the asynchronous version (used by pages) and any mock fallbacks.

---

## 🚀 Flujo de Verificación y Despliegue

1.  **Verificación local sin servidor**: Para validar que los cambios de código no rompan la aplicación y evitar errores de TypeScript, ejecuta `npm run build` en local. No es necesario levantar un servidor de desarrollo local (`npm run dev`) ni configurar credenciales locales de Supabase (`.env.local`), a menos que sea estrictamente necesario para depurar algún error específico de la integración.
2.  **Pruebas funcionales**: La verificación visual y funcional final se realiza directamente en el entorno de Staging/Producción provisto por Vercel una vez que los cambios se suben a GitHub.

