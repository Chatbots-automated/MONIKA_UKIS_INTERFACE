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

async function checkLogs() {
  console.log('Checking audit logs...\n');
  
  const { data, error } = await supabase
    .from('user_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('Recent audit logs:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n\nLog count by action:');
  const actionCounts = data.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});
  console.log(actionCounts);
}

checkLogs();
