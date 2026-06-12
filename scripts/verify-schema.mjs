import pg from 'pg'
import fs from 'fs'
import path from 'path'

const envText = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const env = {}
for (const raw of envText.split(/\r?\n/)) {
  if (!raw || raw.startsWith('#')) continue
  const eq = raw.indexOf('=')
  if (eq < 0) continue
  const key = raw.slice(0, eq).trim()
  let value = raw.slice(eq + 1).trim().replace(/^"|"$/g, '').replace(/\\r\\n/g, '').replace(/\\n/g, '').replace(/\\r/g, '')
  env[key] = value
}

const { Client } = pg
const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

console.log('=== SUPABASE PROD SCHEMA VERIFICATION ===\n')

const { rows: t1 } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('site_settings', 'payment_reminder_log')
  ORDER BY table_name
`)
console.log('✓ New tables:', t1.map(r => r.table_name).join(', '))

const { rows: t2 } = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'athletes' AND column_name IN ('next_payment_due', 'last_payment_date')
  ORDER BY column_name
`)
console.log('✓ New athletes columns:', t2)

const { rows: t3 } = await client.query(`
  SELECT indexname FROM pg_indexes
  WHERE tablename IN ('site_settings', 'payment_reminder_log', 'athletes')
  AND schemaname = 'public'
  ORDER BY tablename, indexname
`)
console.log('✓ Indexes:')
for (const r of t3) console.log('    -', r.indexname)

const { rows: t4 } = await client.query(`
  SELECT key, value FROM site_settings ORDER BY key
`)
console.log('✓ site_settings rows:')
for (const r of t4) console.log(`    - ${r.key} = ${r.value}`)

const { rows: t5 } = await client.query(`
  SELECT tablename, policyname, cmd FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('site_settings', 'payment_reminder_log')
  ORDER BY tablename, policyname
`)
console.log('✓ RLS policies on new tables:')
for (const r of t5) console.log(`    - ${r.polname} (${r.cmd})`)

const { rows: t6 } = await client.query(`
  SELECT count(*)::int AS n FROM athletes
`)
console.log(`✓ athletes count: ${t6[0].n}`)

await client.end()
console.log('\n=== VERIFICATION COMPLETE ===')
