import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

// Try with minimal fields
console.log('Test 1: Minimal insert');
const { data: d1, error: e1 } = await supabase
  .from('invoices')
  .insert({ invoice_number: 'T1', invoice_date: '2025-11-11' })
  .select();
  
if (e1) {
  console.log('Error:', e1.message);
} else {
  console.log('Success! Columns available:', Object.keys(d1[0]).join(', '));
  
  // Delete test record
  await supabase.from('invoices').delete().eq('id', d1[0].id);
}
