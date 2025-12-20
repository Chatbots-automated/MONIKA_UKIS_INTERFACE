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

console.log('\n🥛 Milk Production & Testing Module Setup');
console.log('═══════════════════════════════════════════════════════════════');
console.log('This will create:');
console.log('  • milk_production table (realtime scale data)');
console.log('  • milk_tests table (lab test results)');
console.log('  • vw_milk_analytics view (combined analytics)');
console.log('  • Realtime subscriptions enabled');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('⚠️  Database Password Required');
console.log('\nTo get your password:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
console.log('2. Find "Database Password" section');
console.log('3. Copy your password');
console.log('\nThen run this command:');
console.log('\x1b[36m%s\x1b[0m', 'DB_PASSWORD=your_password_here node apply_milk_module_migration.js');
console.log('═══════════════════════════════════════════════════════════════\n');

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  console.log('Or, you can run the SQL manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/editor');
  console.log('2. Open SQL Editor');
  console.log('3. Open file: create_milk_module_migration.sql');
  console.log('4. Copy all contents and paste into SQL Editor');
  console.log('5. Click "Run" to execute\n');
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
      path.join(__dirname, 'create_milk_module_migration.sql'),
      'utf8'
    );

    console.log('Applying migration to database...');
    await client.query(sqlContent);

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 What was created:');
    console.log('  ✓ milk_production table (with realtime enabled)');
    console.log('  ✓ milk_tests table (with realtime enabled)');
    console.log('  ✓ vw_milk_analytics view');
    console.log('  ✓ RLS policies configured');
    console.log('  ✓ Indexes for performance');
    console.log('\n🔍 Next steps:');
    console.log('  1. The Pienas module will be added to your app');
    console.log('  2. Connect your milk scale to send data to milk_production table');
    console.log('  3. Import lab test results to milk_tests table');
    console.log('  4. View realtime production data and analytics');
  } catch (err) {
    console.error('\n❌ Error applying migration:', err.message);
    console.log('\nPlease try running the SQL manually in Supabase Dashboard instead.');
  } finally {
    await client.end();
  }
}

applyMigration();
