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
  env.VITE_SUPABASE_ANON_KEY
);

async function checkPolicies() {
  console.log('Checking animal_visits RLS policies and structure...\n');

  // Check if table exists and has RLS enabled
  const { data: tableInfo, error: tableError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'animal_visits';
      `
    });

  console.log('=== TABLE INFO ===');
  console.log(JSON.stringify(tableInfo, null, 2));
  if (tableError) console.error('Table error:', tableError);

  // Check columns
  const { data: columns, error: colError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'animal_visits'
        ORDER BY ordinal_position;
      `
    });

  console.log('\n=== COLUMNS ===');
  console.log(JSON.stringify(columns, null, 2));
  if (colError) console.error('Column error:', colError);

  // Check policies
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'animal_visits'
        ORDER BY policyname;
      `
    });

  console.log('\n=== RLS POLICIES ===');
  console.log(JSON.stringify(policies, null, 2));
  if (policyError) console.error('Policy error:', policyError);

  // Check if exec_sql function exists
  const { data: functions, error: funcError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name LIKE '%exec%'
        ORDER BY routine_name;
      `
    });

  console.log('\n=== EXEC FUNCTIONS ===');
  console.log(JSON.stringify(functions, null, 2));
  if (funcError) console.error('Function error:', funcError);
}

checkPolicies().catch(console.error);
