import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.z-I1Z4uNZG3gkBXpuOx4X_LDfFRv-6G5g9rbHTK91ys'; // Service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = readFileSync('./supabase/migrations/20251103000000_create_admin_system_tables.sql', 'utf8');

console.log('Applying migration...');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Migration applied successfully!');
  }
} catch (err) {
  console.error('Exception:', err);
}
