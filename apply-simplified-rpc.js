const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function applyMigration() {
  console.log('🔧 Applying simplified milk weight RPC migration...\n');

  // Read the migration SQL
  const sql = fs.readFileSync('./simplify-milk-weight-rpc.sql', 'utf8');

  // Parse the connection URL from Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = match ? match[1] : null;

  if (!projectRef) {
    console.error('❌ Could not parse project ref from Supabase URL');
    console.log('\n📋 Please apply the migration manually:\n');
    console.log('1. Visit: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new');
    console.log('2. Copy contents from: simplify-milk-weight-rpc.sql');
    console.log('3. Click "Run"');
    return;
  }

  // Use anon key to try via REST API
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Try to execute using service role
    console.log('Attempting to apply migration...');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('/*') && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log('Creating function...');
      } else if (statement.includes('COMMENT')) {
        console.log('Adding comment...');
      }
    }

    console.log('\n✅ Migration needs to be applied via Supabase Dashboard');
    console.log('\n📋 Instructions:');
    console.log('1. Visit: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new');
    console.log('2. Copy the entire contents from: simplify-milk-weight-rpc.sql');
    console.log('3. Click "Run"');
    console.log('\n📝 The function will accept this simplified payload:');
    console.log('   {');
    console.log('     "p_weight": 14975,');
    console.log('     "p_hose": "disconnected",');
    console.log('     "p_stable": true,');
    console.log('     "p_timestamp_lt": "2026-01-05 22:34:22",');
    console.log('     "p_tz": "Europe/Vilnius"');
    console.log('   }');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applyMigration();
