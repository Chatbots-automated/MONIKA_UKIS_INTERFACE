import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFile } from 'fs/promises';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

console.log('Reading migration file...');
const migrationSQL = await readFile('./supabase/migrations/20251111110000_fix_invoices_table_schema.sql', 'utf-8');

console.log('Applying migration...');

// Remove comments and split by statement
const statements = migrationSQL
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim())
  .join('\n')
  .split(';')
  .filter(stmt => stmt.trim());

for (const statement of statements) {
  if (!statement.trim()) continue;
  
  console.log('\nExecuting statement...');
  
  const response = await fetch(
    process.env.VITE_SUPABASE_URL + '/rest/v1/rpc/exec_sql',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
      },
      body: JSON.stringify({ query: statement.trim() + ';' })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
  } else {
    console.log('Success');
  }
}

console.log('\n--- Testing insert with new columns ---');
const { data, error } = await supabase
  .from('invoices')
  .insert({
    invoice_number: 'TEST-FINAL',
    invoice_date: '2025-11-11',
    supplier_name: 'Test Supplier',
    pdf_filename: 'test.pdf',
    total_net: 100,
    total_vat: 21,
    total_gross: 121
  })
  .select();

if (error) {
  console.error('Insert test failed:', error);
} else {
  console.log('SUCCESS! All columns working:', Object.keys(data[0]).join(', '));
  // Clean up
  await supabase.from('invoices').delete().eq('id', data[0].id);
}
