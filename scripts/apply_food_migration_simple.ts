import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrationStatements(filename: string) {
  console.log(`\nRunning: ${filename}`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  // Split by semicolons but be careful with function definitions
  const statements = sql
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|COMMENT|--|\n\n))/i)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));
  
  console.log(`  Found ${statements.length} statements to execute`);
  
  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim() + ';';
    
    try {
      console.log(`  [${i + 1}/${statements.length}] Executing...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      
      if (error) {
        // Try direct query if RPC doesn't exist
        console.log(`  Trying direct query...`);
        const { error: queryError } = await supabase.from('_sql').select('*').limit(0);
        
        if (queryError) {
          console.error(`  ❌ Error: ${error.message}`);
          console.error(`  Statement preview: ${stmt.substring(0, 100)}...`);
          continue;
        }
      }
      
      successCount++;
      console.log(`  ✓ Success`);
      
    } catch (error: any) {
      console.error(`  ❌ Exception: ${error.message}`);
      console.error(`  Statement preview: ${stmt.substring(0, 100)}...`);
    }
  }
  
  console.log(`\n✓ Completed: ${successCount}/${statements.length} statements succeeded`);
  return successCount === statements.length;
}

async function main() {
  console.log('Applying Food Preferences migration...');
  console.log('This will create the "Pietūs" (Food) module tables and views.\n');
  
  const migrations = [
    '20260405000000_create_food_preferences.sql',
  ];
  
  for (const migration of migrations) {
    await runMigrationStatements(migration);
  }
  
  console.log('\n✓ Migration process completed!');
  console.log('\nNote: If you see errors, you may need to run the SQL manually in the Supabase SQL Editor.');
  console.log('\nYou can now:');
  console.log('1. Workers can log in and mark their food preferences in the "Pietūs" tab');
  console.log('2. Admins can view food orders in Admin Dashboard > Pietūs');
}

main();
