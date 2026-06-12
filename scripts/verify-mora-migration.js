// Quick verification: read the current distribution of mora_months
// to confirm the backfill ran. Also checks that the athletes table
// has at least one row with mora_months > 0 (if there was pre-existing
// debt).

const { Client } = require('pg')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT
        mora_months,
        COUNT(*) AS athletes
      FROM athletes
      WHERE mora_months > 0
      GROUP BY mora_months
      ORDER BY mora_months DESC
    `)
    if (rows.length === 0) {
      console.log('No athletes currently have mora_months > 0 (either no debt or backfill emptied everything).')
    } else {
      console.log('Current distribution of mora_months > 0:')
      console.log('mora_months | athletes')
      for (const r of rows) {
        console.log(`  ${String(r.mora_months).padStart(2)}        | ${r.athletes}`)
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Verification failed:', err.message)
  process.exit(1)
})
