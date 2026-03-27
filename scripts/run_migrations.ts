import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename: string) {
  console.log(`\nRunning: ${filename}`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
  
  console.log(`✓ Success`);
  return true;
}

async function main() {
  console.log('Running secretary system migrations...');
  
  const migrations = [
    '20260326000002_recreate_equipment_invoices.sql',
    '20260326000003_recreate_equipment_invoice_items.sql',
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('\nMigration failed. Stopping.');
      process.exit(1);
    }
  }
  
  console.log('\n✓ All migrations completed!');
}

main();
