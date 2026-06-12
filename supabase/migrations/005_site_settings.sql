-- ============================================================================
-- MIGRATION 005: site_settings (key-value JSONB config)
-- Purpose: Centralize app-level config (pricing, currency, due day) so it
--          can be edited from the admin UI without code changes.
--          Single-tenant MVP — does NOT live in `teams` to keep the team
--          entity focused on identity (name, logo, location) rather than
--          billing policy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

-- Seed defaults for the pricing config.
INSERT INTO site_settings (key, value) VALUES
  ('monthly_fee',     '17000'::jsonb),
  ('currency',        '"ARS"'::jsonb),
  ('payment_due_day', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select_auth" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;

CREATE POLICY "site_settings_select_auth"
  ON site_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "site_settings_admin_write"
  ON site_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()::TEXT));

CREATE POLICY "site_settings_admin_update"
  ON site_settings
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()::TEXT))
  WITH CHECK (is_admin(auth.uid()::TEXT));
