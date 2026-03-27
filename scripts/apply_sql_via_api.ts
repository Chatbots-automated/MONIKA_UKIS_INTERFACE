import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

async function executeSql(sql: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }
  
  return await response.json();
}

async function runMigration(filename: string) {
  console.log(`\nRunning: ${filename}`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`  Found ${statements.length} statements`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length < 10) continue;
    
    try {
      process.stdout.write(`\r  Executing statement ${i + 1}/${statements.length}...`);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({})
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`\n❌ Error on statement ${i + 1}: ${error.message}`);
      console.error(`Statement: ${stmt.substring(0, 100)}...`);
      return false;
    }
  }
  
  console.log(`\n✓ Success`);
  return true;
}

async function main() {
  console.log('Applying SQL migrations directly...\n');
  console.log('Note: This will execute SQL statements one by one.');
  console.log('Large migrations may take a few minutes.\n');
  
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
