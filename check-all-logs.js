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
  console.log('Checking ALL audit logs...\n');
  
  const { data, error, count } = await supabase
    .from('user_audit_logs')
    .select('action, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log(`Total logs: ${count}\n`);
  
  console.log('Action breakdown:');
  const actionCounts = data.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).forEach(([action, count]) => {
    console.log(`  ${action}: ${count}`);
  });
}

checkLogs();
