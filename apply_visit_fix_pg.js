import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const { Client } = pg;

// Extract database connection string from Supabase URL
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env file');
  process.exit(1);
}

// Parse Supabase URL to get project reference
const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!urlMatch) {
  console.error('Invalid Supabase URL format');
  process.exit(1);
}

const projectRef = urlMatch[1];

// Construct PostgreSQL connection string
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
console.log('\n⚠️  Database Password Required');
console.log('═══════════════════════════════════════════════════════════════');
console.log('To apply this fix, you need your Supabase database password.');
console.log('\nTo get your password:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
console.log('2. Find "Database Password" section');
console.log('3. Copy your password');
console.log('\nThen run this command:');
console.log('\x1b[36m%s\x1b[0m', 'DB_PASSWORD=your_password_here node apply_visit_fix_pg.js');
console.log('═══════════════════════════════════════════════════════════════\n');

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  console.log('Or, you can run the SQL manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/editor');
  console.log('2. Open SQL Editor');
  console.log('3. Copy and paste the contents of fix_visit_medications.sql');
  console.log('4. Click "Run" to execute\n');
  process.exit(0);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function applyFix() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('\nReading SQL fix file...');
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'fix_visit_medications.sql'),
      'utf8'
    );

    console.log('Applying fix to database...');
    await client.query(sqlContent);

    console.log('✅ Fix applied successfully!');
    console.log('\nThe visit completion function now correctly uses the batches table.');
    console.log('You can now complete visits without errors.');
  } catch (err) {
    console.error('\n❌ Error applying fix:', err.message);
    console.log('\nPlease try running the SQL manually in Supabase Dashboard instead.');
  } finally {
    await client.end();
  }
}

applyFix();
