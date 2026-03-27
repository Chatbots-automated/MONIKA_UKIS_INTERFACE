import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runStatement(sql: string, index: number, total: number) {
  try {
    const { data, error } = await (supabase as any).rpc('exec', { sql });
    if (error) throw error;
    process.stdout.write(`\r  Progress: ${index}/${total} statements executed`);
    return true;
  } catch (error: any) {
    console.error(`\n❌ Failed at statement ${index}:`, error.message);
    console.error(`SQL: ${sql.substring(0, 200)}...`);
    return false;
  }
}

async function runMigration(filename: string) {
  console.log(`\n\nRunning: ${filename}`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--') && s.toUpperCase().includes('TABLE'));
  
  console.log(`  Found ${statements.length} SQL statements\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    const success = await runStatement(stmt, i + 1, statements.length);
    if (!success) return false;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✓ Migration completed');
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('APPLYING SECRETARY SYSTEM MIGRATIONS');
  console.log('='.repeat(60));
  
  const migrations = [
    '20260326000002_recreate_equipment_invoices.sql',
    '20260326000003_recreate_equipment_invoice_items.sql',
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('\n\nMigration failed. Stopping.');
      process.exit(1);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✓ ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
}

main();
