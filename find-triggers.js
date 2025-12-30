import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function findTriggers() {
  console.log('Finding all triggers on usage_items table...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        t.tgname as trigger_name,
        p.proname as function_name,
        CASE t.tgenabled
          WHEN 'O' THEN 'ENABLED'
          WHEN 'D' THEN 'DISABLED'
          ELSE t.tgenabled::text
        END as status
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgrelid = 'usage_items'::regclass
        AND NOT t.tgisinternal
      ORDER BY t.tgname;
    `
  });

  if (error) {
    // Try direct query if RPC doesn't exist
    console.log('Trying alternative method...\n');

    const { data: triggers, error: err2 } = await supabase
      .from('pg_trigger')
      .select('*')
      .limit(1);

    if (err2) {
      console.error('Cannot query pg_trigger:', err2.message);
      console.log('\nTrying with raw SQL execution...\n');

      // Last resort - just try to disable common trigger names
      const possibleNames = [
        'usage_items_stock_check_trigger',
        'check_usage_constraints_trigger',
        'usage_constraint_trigger',
        'validate_stock_trigger'
      ];

      console.log('Possible trigger names to try:');
      possibleNames.forEach(name => console.log(`  - ${name}`));

      return;
    }
  }

  if (data && data.length > 0) {
    console.log('Found triggers:');
    data.forEach(t => {
      console.log(`  - ${t.trigger_name} (${t.function_name}) [${t.status}]`);
    });
  } else {
    console.log('No triggers found on usage_items table');
  }
}

findTriggers().catch(console.error);
