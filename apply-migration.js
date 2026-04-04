import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://olxnahsxvyiadknybagt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename) {
  console.log(`\nRunning migration: ${filename}`);
  const sql = fs.readFileSync(path.join('supabase', 'migrations', filename), 'utf8');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error(`Error in ${filename}:`, error);
      return false;
    }
    console.log(`✓ ${filename} completed successfully`);
    return true;
  } catch (err) {
    console.error(`Exception in ${filename}:`, err);
    return false;
  }
}

async function main() {
  const migrations = [
    '20260213000007_fix_overnight_hours_step1.sql',
    '20260213000008_fix_overnight_hours_step2.sql',
    '20260213000009_fix_overnight_hours_step3.sql',
    '20260213000010_fix_overnight_hours_step4.sql'
  ];

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.log('\nStopping due to error.');
      process.exit(1);
    }
  }

  console.log('\n✓ All migrations completed successfully!');
}

main();
