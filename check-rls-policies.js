import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('/tmp/cc-agent/59000172/project/.env', 'utf8');
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

async function checkRLS() {
  console.log('Checking RLS policies for animal_visits...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'animal_visits'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Policies:', JSON.stringify(data, null, 2));
}

checkRLS();
