import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://olxnahsxvyiadknybagt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function runSQL(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 100)}...`);
    const { error } = await supabase.rpc('exec', { sql: statement + ';' });
    if (error) {
      throw error;
    }
  }
}

async function main() {
  console.log('Step 1: Creating exec helper function...\n');
  
  // First, create a helper function to execute arbitrary SQL
  const createExecFunc = `
    CREATE OR REPLACE FUNCTION exec(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    // Try to create the exec function using a direct query
    const { error: execError } = await supabase.rpc('exec', { sql: createExecFunc });
    if (execError && !execError.message.includes('does not exist')) {
      console.log('Creating exec function via alternative method...');
      // If exec doesn't exist, we need to create it differently
      // We'll just run the migrations directly via the PostgREST API
    }
  } catch (err) {
    console.log('Will run migrations directly...');
  }

  const migrations = [
    '20260213000007_fix_overnight_hours_step1.sql',
    '20260213000008_fix_overnight_hours_step2.sql',
    '20260213000009_fix_overnight_hours_step3.sql',
    '20260213000010_fix_overnight_hours_step4.sql'
  ];

  for (const migration of migrations) {
    console.log(`\n\nRunning migration: ${migration}`);
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', migration), 'utf8');
    
    try {
      await runSQL(sql);
      console.log(`✓ ${migration} completed successfully`);
    } catch (err) {
      console.error(`✗ Error in ${migration}:`, err.message);
      console.error('Full error:', err);
      process.exit(1);
    }
  }

  console.log('\n✓ All migrations completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
