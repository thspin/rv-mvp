const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      // Remove enclosing quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      // Sanitize Windows carriage returns, newlines, and literal escape characters
      value = value.replace(/\\r\\n/g, '').replace(/\\n/g, '').replace(/\\r/g, '');
      value = value.replace(/[\r\n]/g, '').trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key length:", supabaseServiceKey.length);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  // 1. Get first team
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .limit(1);

  if (teamsError || !teams || teams.length === 0) {
    console.error("Error fetching teams or no teams found:", teamsError);
    process.exit(1);
  }

  const team = teams[0];
  console.log(`Using team: ${team.name} (${team.id})`);

  // 2. Generate unique email/id
  const rand = Math.random().toString(36).substring(2, 9);
  const userId = `mock-user-${rand}`;
  const email = `atleta.falso.${rand}@example.com`;
  const name = `Atleta Falso ${rand.toUpperCase()}`;

  // 3. Insert into "user"
  const { error: userError } = await supabase.from('user').insert({
    id: userId,
    name,
    email,
    emailVerified: false,
    role: 'atleta',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (userError) {
    console.error("Error inserting user:", userError);
    process.exit(1);
  }

  console.log(`Inserted user ${name} with id ${userId}`);

  // 4. Insert into "athletes"
  const { error: athleteError } = await supabase.from('athletes').insert({
    user_id: userId,
    email,
    name,
    role: 'atleta',
    onboarding_complete: true,
    dni: "12345678",
    phone: "+5491122334455",
    team_id: team.id,
    team_status: "pendiente",
    payment_status: "Pendiente_Pago",
    apto_medico_status: "no_entregado",
  });

  if (athleteError) {
    console.error("Error inserting athlete:", athleteError);
    // Cleanup user
    await supabase.from('user').delete().eq('id', userId);
    process.exit(1);
  }

  console.log(`Inserted athlete request successfully!`);
  console.log(`Email: ${email}`);
}

main();
