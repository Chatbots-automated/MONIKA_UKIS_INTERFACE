import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Applying Withdrawal Calculation Fix...\n');

const migrationSQL = readFileSync('./supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql', 'utf8');

// Remove the comment block at the beginning
const sqlCommands = migrationSQL
  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0);

console.log(`📝 Found ${sqlCommands.length} SQL commands to execute\n`);

let success = 0;
let failed = 0;

for (let i = 0; i < sqlCommands.length; i++) {
  const cmd = sqlCommands[i];
  if (!cmd) continue;

  // Skip comment-only commands
  if (cmd.startsWith('--')) continue;

  console.log(`\n[${i + 1}/${sqlCommands.length}] Executing command...`);
  console.log(`Preview: ${cmd.substring(0, 80)}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', { query: cmd + ';' });

    if (error) {
      // Try direct query execution as fallback
      const { error: directError } = await supabase.from('_sql_exec').select('*').limit(0);

      if (directError && directError.message.includes('does not exist')) {
        console.log('⚠️  Cannot execute: RPC function not available');
        console.log('   You need to run this SQL manually in Supabase SQL Editor');
        failed++;
      } else {
        throw error;
      }
    } else {
      console.log('✅ Success');
      success++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(70));
console.log('📊 Results:');
console.log('='.repeat(70));
console.log(`✅ Successful: ${success}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n⚠️  MANUAL ACTION REQUIRED:');
  console.log('   1. Open your Supabase dashboard');
  console.log('   2. Go to SQL Editor');
  console.log('   3. Copy and paste the contents of:');
  console.log('      supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql');
  console.log('   4. Run the SQL');
  console.log('   5. Test again with: node test-withdrawal-calculation.js');
} else {
  console.log('\n✅ Migration applied successfully!');
  console.log('   Test with: node test-withdrawal-calculation.js');
}

process.exit(failed > 0 ? 1 : 0);
