import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.z-I1Z4uNZG3gkBXpuOx4X_LDfFRv-6G5g9rbHTK91ys';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

const sql = readFileSync('./supabase/migrations/20251111000000_create_animal_analytics_views.sql', 'utf8');

console.log('Applying analytics migration...');

const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('--'));

for (const statement of statements) {
  if (!statement) continue;

  console.log('\nExecuting statement...');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

    if (error) {
      console.error('Error:', error);
      break;
    } else {
      console.log('✓ Success');
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

console.log('\nMigration completed!');
process.exit(0);
