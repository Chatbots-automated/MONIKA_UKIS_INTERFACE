const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    connectionString: process.env.VITE_SUPABASE_DB_URL,
  });

  await client.connect();

  // Check triggers on usage_items
  const result = await client.query(`
    SELECT
      t.tgname as trigger_name,
      t.tgenabled as enabled,
      pg_get_triggerdef(t.oid) as trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'usage_items'
    AND NOT t.tgisinternal
    ORDER BY t.tgname;
  `);

  console.log('=== Triggers on usage_items table ===\n');

  if (result.rows.length === 0) {
    console.log('No triggers found!');
  } else {
    result.rows.forEach(row => {
      console.log(`Trigger: ${row.trigger_name}`);
      console.log(`Enabled: ${row.enabled}`);
      console.log(`Definition:\n${row.trigger_def}\n`);
    });
  }

  await client.end();
})();
