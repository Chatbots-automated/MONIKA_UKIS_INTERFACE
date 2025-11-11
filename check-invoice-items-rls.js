import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

console.log('Checking RLS policies for invoice_items...\n');

const { data, error } = await supabase.rpc('exec_sql', {
  sql: `
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
    WHERE tablename = 'invoice_items'
    ORDER BY policyname;
  `
});

if (error) {
  // Try alternative method
  const result = await supabase.rpc('get_policies', { table_name: 'invoice_items' });
  if (result.error) {
    console.log('Using direct query...');
    const query = `
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'invoice_items';
    `;
    console.log('Run this in Supabase SQL Editor:\n', query);
  } else {
    console.log('Policies:', result.data);
  }
} else {
  if (data && data.length > 0) {
    data.forEach(policy => {
      console.log(`Policy: ${policy.policyname}`);
      console.log(`  Command: ${policy.cmd}`);
      console.log(`  Using: ${policy.qual || 'N/A'}`);
      console.log(`  With Check: ${policy.with_check || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('❌ No policies found for invoice_items table!');
  }
}
