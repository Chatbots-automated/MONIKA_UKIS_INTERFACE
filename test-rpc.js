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
  env.VITE_SUPABASE_ANON_KEY
);

async function testRPC() {
  console.log('Testing log_user_action RPC function...\n');
  
  // First, get a real user ID
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);
  
  if (!users || users.length === 0) {
    console.error('No users found');
    return;
  }
  
  const testUserId = users[0].id;
  console.log('Using user:', users[0].email, '(', testUserId, ')');
  
  // Try to call the RPC function
  console.log('\nCalling log_user_action...');
  const { data, error } = await supabase.rpc('log_user_action', {
    p_user_id: testUserId,
    p_action: 'test_treatment_creation',
    p_table_name: 'treatments',
    p_record_id: '00000000-0000-0000-0000-000000000000',
    p_old_data: null,
    p_new_data: { test: 'data', animal_tag: 'TEST123' },
  });
  
  if (error) {
    console.error('ERROR:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS! Log ID:', data);
  }
  
  // Check if the log was created
  console.log('\nChecking if log was created...');
  const { data: logs } = await supabase
    .from('user_audit_logs')
    .select('*')
    .eq('action', 'test_treatment_creation')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (logs && logs.length > 0) {
    console.log('Log entry found:', JSON.stringify(logs[0], null, 2));
  } else {
    console.log('No log entry found with action test_treatment_creation');
  }
}

testRPC();
