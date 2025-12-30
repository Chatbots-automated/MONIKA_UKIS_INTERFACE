const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  // Supabase connection details
  const projectRef = 'olxnahsxvyiadknybagt';
  const region = 'eu-central-1';

  // You'll need the actual database password
  // For Supabase, this is typically found in Project Settings > Database > Connection string
  const connectionString = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

  console.log('🔧 Vaccination Stock Deduction Fix Migration\n');

  const migrationSQL = fs.readFileSync(
    './supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql',
    'utf8'
  );

  console.log('⚠️  This script requires your Supabase database password.');
  console.log('    Find it in: Project Settings > Database > Connection string\n');
  console.log('    Or use the Supabase Dashboard SQL Editor instead (recommended)\n');

  // Uncomment and add password to run:
  /*
  const client = new Client({
    connectionString: connectionString.replace('[YOUR-PASSWORD]', 'your-actual-password'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔄 Executing migration...\n');
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');
    console.log('🎉 Vaccinations will now automatically deduct from stock!\n');
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
  */
}

runMigration();
