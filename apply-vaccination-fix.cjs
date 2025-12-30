const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Extract connection details from Supabase URL
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

const connectionString = `postgresql://postgres.${projectRef}:${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected\n');

    const sql = fs.readFileSync('fix-vaccination-backfill.sql', 'utf-8');
    
    console.log('Applying vaccination backfill migration...\n');
    
    await client.query(sql);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('All vaccinations have been backfilled into usage_items.');
    
  } catch (err) {
    console.error('❌ Migration failed:');
    console.error(err.message);
    console.error('\n📋 Manual application required:');
    console.error('1. Open Supabase Dashboard → SQL Editor');
    console.error('2. Copy contents of: fix-vaccination-backfill.sql');
    console.error('3. Paste and click Run');
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
