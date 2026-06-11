const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read env local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const lines = envFile.split('\n');
let databaseUrl = '';

for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    let val = line.substring('DATABASE_URL='.length).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    // Remove literal \r\n, \r, \n, and other formatting artifacts
    val = val.replace(/\\r\\n/g, '')
             .replace(/\\r/g, '')
             .replace(/\\n/g, '')
             .replace(/\r/g, '')
             .replace(/\n/g, '')
             .trim();
    databaseUrl = val;
  }
}

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('Connecting to database...');
const client = new Client({
  connectionString: databaseUrl,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected successfully. Running migration to add CBU and Alias columns to teams table...');
    
    await client.query(`
      ALTER TABLE teams 
      ADD COLUMN IF NOT EXISTS bank_cbu TEXT,
      ADD COLUMN IF NOT EXISTS bank_alias TEXT;
    `);
    
    console.log('Success: Columns bank_cbu and bank_alias added to teams table!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
