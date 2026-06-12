// Run via: node scripts/apply-mora-migration.js
// Or: psql "$DATABASE_URL" -f supabase/migrations/006_mora_months_to_months.sql

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_mora_months_to_months.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log('Applying 006_mora_months_to_months.sql ...')
    await client.query(sql)
    console.log('Migration applied OK')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
