import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Client } = pg;

const supabaseUrl = process.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env file');
  process.exit(1);
}

const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!urlMatch) {
  console.error('Invalid Supabase URL format');
  process.exit(1);
}

const projectRef = urlMatch[1];

console.log('\n⚠️  Database Password Required');
console.log('═══════════════════════════════════════════════════════════════');
console.log('To apply this migration, you need your Supabase database password.');
console.log('\nTo get your password:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
console.log('2. Find "Database Password" section');
console.log('3. Copy your password');
console.log('\nThen run this command:');
console.log('\x1b[36m%s\x1b[0m', 'DB_PASSWORD=your_password_here node apply_user_notes_migration_pg.js');
console.log('═══════════════════════════════════════════════════════════════\n');

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  console.log('Or, you can run the SQL manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('2. Open SQL Editor');
  console.log('3. Copy and paste the contents of supabase/migrations/20251207000000_create_user_notes.sql');
  console.log('4. Click "Run" to execute\n');
  process.exit(0);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('\nReading migration file...');
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'supabase/migrations/20251207000000_create_user_notes.sql'),
      'utf8'
    );

    console.log('Applying migration to database...');
    await client.query(sqlContent);

    console.log('✅ Migration applied successfully!');
    console.log('\nUser notes table has been created.');
    console.log('Users can now use the notepad feature.');
  } catch (err) {
    console.error('\n❌ Error applying migration:', err.message);
    console.log('\nPlease try running the SQL manually in Supabase Dashboard instead.');
  } finally {
    await client.end();
  }
}

applyMigration();
