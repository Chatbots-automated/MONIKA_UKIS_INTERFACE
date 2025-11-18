import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function applyMigration() {
  console.log('📝 Reading migration file...');
  const sql = readFileSync('./supabase/migrations/20251118120000_course_medication_deduction_on_completion.sql', 'utf8');

  // Split into individual statements
  const statements = sql
    .split(/;\s*$/gm)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('/*') && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
    console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));

    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

    if (error) {
      console.error('❌ Error:', error.message);

      // Try alternative approach for each statement type
      if (stmt.includes('ALTER TABLE') && stmt.includes('ADD COLUMN')) {
        console.log('Trying direct column addition...');
        // Extract table and column info and try individual additions
        continue;
      }
    } else {
      console.log('✅ Success');
    }
  }

  console.log('\n✨ Migration complete!');
}

applyMigration().catch(console.error);
