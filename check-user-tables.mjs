import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

// Check for users tables
console.log('Checking for user/profile tables...\n');

const tables = ['users', 'user_profiles', 'profiles'];

for (const table of tables) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .limit(1);
    
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: EXISTS`);
  }
}
