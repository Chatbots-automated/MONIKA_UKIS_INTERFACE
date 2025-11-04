import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.z-I1Z4uNZG3gkBXpuOx4X_LDfFRv-6G5g9rbHTK91ys';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sql = readFileSync('./supabase/migrations/20251104000000_enhance_visits_system.sql', 'utf8');

console.log('Applying visits enhancement migration...');

try {
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  } else {
    console.log('Migration applied successfully!');
  }
} catch (err) {
  console.error('Exception:', err);
  process.exit(1);
}
