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
console.log('To apply the automated medical waste tracking system, you need your Supabase database password.');
console.log('\nTo get your password:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
console.log('2. Find "Database Password" section');
console.log('3. Copy your password');
console.log('\nThen run this command:');
console.log('\x1b[36m%s\x1b[0m', 'DB_PASSWORD=your_password_here node apply_medical_waste_automation.js');
console.log('═══════════════════════════════════════════════════════════════\n');

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  console.log('Or, you can run the SQL manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('2. Open SQL Editor');
  console.log('3. Copy and paste the contents of apply_medical_waste_automation.sql');
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

    console.log('\nReading migration SQL file...');
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'apply_medical_waste_automation.sql'),
      'utf8'
    );

    console.log('Applying automated medical waste tracking system...');
    await client.query(sqlContent);

    console.log('✅ Migration applied successfully!');
    console.log('\n📋 What was added:');
    console.log('  • package_weight_g column to products table');
    console.log('  • auto_generated, source_batch_id, source_product_id, package_count columns to medical_waste table');
    console.log('  • batch_waste_tracking table for preventing duplicates');
    console.log('  • auto_generate_medical_waste() function');
    console.log('  • trigger_check_batch_depletion trigger on usage_items');
    console.log('  • vw_medical_waste_with_details view');
    console.log('\n🎯 Now when a batch reaches zero stock:');
    console.log('  • Medical waste is automatically generated');
    console.log('  • Weight is calculated from package_count × package_weight_g');
    console.log('  • Each batch creates a separate waste entry');
    console.log('  • Duplicates are prevented via batch_waste_tracking');
    console.log('\n💡 Next steps:');
    console.log('  • Add package_weight_g values to your products');
    console.log('  • The system will automatically start generating waste entries');
  } catch (err) {
    console.error('\n❌ Error applying migration:', err.message);
    console.log('\nPlease try running the SQL manually in Supabase Dashboard instead.');
    console.log('File location: apply_medical_waste_automation.sql');
  } finally {
    await client.end();
  }
}

applyMigration();
