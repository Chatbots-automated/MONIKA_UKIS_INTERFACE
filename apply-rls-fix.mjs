import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const sql = readFileSync('./supabase/migrations/20251104100000_fix_animal_visits_rls.sql', 'utf8');

(async () => {
  try {
    console.log('Applying RLS fix migration...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Migration applied successfully!');
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
