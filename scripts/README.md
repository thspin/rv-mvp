# Dev Scripts

Scripts de utilidad para desarrollo local. No se ejecutan en producción.

## `apply-migrations.mjs`

Aplica las migraciones SQL del directorio `supabase/migrations/` a la base de Supabase apuntada por `DATABASE_URL` en `.env.local`.

**Alternativa a `npx supabase db push`** cuando no estás autenticado al CLI de Supabase o necesitas aplicar una migración puntual sin tener que enlazar el proyecto.

```bash
# Aplica las 2 últimas migraciones (004 y 005)
node scripts/apply-migrations.mjs
```

Para aplicar una migración distinta, edita el array `MIGRATIONS` en el script. Lee los archivos `.sql`, los divide por `;`, y ejecuta cada statement individualmente (necesario porque `pg.Client.query()` no acepta múltiples statements en una llamada).

## `verify-schema.mjs`

Verifica el estado del schema en Supabase prod: tablas nuevas, columnas agregadas, índices creados, RLS policies activas, y los valores seed de `site_settings`.

```bash
node scripts/verify-schema.mjs
```

Útil después de aplicar migraciones para confirmar que todo se persistió correctamente.
