import fs from 'fs'
import path from 'path'
import pg from 'pg'

const PROJECT_ROOT = process.cwd()
const MIGRATIONS = [
  'supabase/migrations/004_payment_due.sql',
  'supabase/migrations/005_site_settings.sql',
]

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env.local')
  const text = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const raw of text.split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue
    const eq = raw.indexOf('=')
    if (eq < 0) continue
    const key = raw.slice(0, eq).trim()
    let value = raw.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    value = value.replace(/\\r\\n/g, '').replace(/\\n/g, '').replace(/\\r/g, '')
    env[key] = value
  }
  return env
}

const { Client } = pg

const env = loadEnv()
const databaseUrl = env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
console.log('✓ Connected to Supabase Postgres')

for (const rel of MIGRATIONS) {
  const sqlPath = path.join(PROJECT_ROOT, rel)
  const sql = fs.readFileSync(sqlPath, 'utf8')
  console.log(`\n→ Applying ${rel} (${sql.length} bytes)...`)
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
  const statements = cleaned
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    try {
      await client.query(stmt)
      console.log(`  ✓ stmt ${i + 1}/${statements.length} (${stmt.slice(0, 60).replace(/\s+/g, ' ')}...)`)
    } catch (err) {
      console.error(`✗ ${rel} FAILED on stmt ${i + 1}:`)
      console.error('  Statement:', stmt)
      console.error('  Error:', err.message)
      await client.end()
      process.exit(1)
    }
  }
  console.log(`✓ ${rel} applied (${statements.length} statements)`)
}

console.log('\n→ Verifying...')
const checks = [
  { table: 'site_settings rows',       sql: "SELECT key, value FROM site_settings ORDER BY key" },
  { table: 'payment_reminder_log cnt', sql: "SELECT count(*)::int FROM payment_reminder_log" },
  { table: 'athletes new columns',     sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'athletes' AND column_name IN ('next_payment_due', 'last_payment_date') ORDER BY column_name" },
  { table: 'rls site_settings',        sql: "SELECT polname FROM pg_policy WHERE polrelid = 'site_settings'::regclass ORDER BY polname" },
  { table: 'rls payment_reminder_log', sql: "SELECT polname FROM pg_policy WHERE polrelid = 'payment_reminder_log'::regclass ORDER BY polname" },
]

for (const c of checks) {
  const { rows } = await client.query(c.sql)
  console.log(`  ${c.table}: ${JSON.stringify(rows)}`)
}

await client.end()
console.log('\n✓ All migrations applied successfully')
