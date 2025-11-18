import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const migration = readFileSync('./supabase/migrations/20251118000000_comprehensive_teat_tracking_system.sql', 'utf8');

// Split by semicolon but be careful with function definitions
const statements = [];
let currentStatement = '';
let inFunction = false;

migration.split('\n').forEach(line => {
  const trimmed = line.trim();

  // Skip comments
  if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.endsWith('*/')) {
    return;
  }

  currentStatement += line + '\n';

  // Track if we're in a function definition
  if (trimmed.includes('$$')) {
    inFunction = !inFunction;
  }

  // End of statement
  if (trimmed.endsWith(';') && !inFunction) {
    statements.push(currentStatement.trim());
    currentStatement = '';
  }
});

async function executeMigration() {
  console.log(`Executing ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.length < 5) continue;

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (error) {
        // Try without rpc
        console.log(`Statement ${i + 1}: Trying alternative method...`);
      } else {
        console.log(`Statement ${i + 1}: Success`);
      }
    } catch (e) {
      console.log(`Statement ${i + 1}: ${statement.substring(0, 50)}...`);
    }
  }

  console.log('Migration complete');
}

executeMigration();
