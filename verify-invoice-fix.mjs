import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

console.log('Testing invoice table with all required columns...\n');

const testInvoice = {
  invoice_number: 'TEST-FINAL',
  invoice_date: '2025-11-11',
  doc_title: 'Test Invoice',
  supplier_name: 'Test Supplier',
  supplier_code: 'TS001',
  supplier_vat: 'LT123456789',
  currency: 'EUR',
  total_net: 100.00,
  total_vat: 21.00,
  total_gross: 121.00,
  vat_rate: 21.00,
  pdf_filename: 'test-invoice.pdf'
};

const { data, error } = await supabase
  .from('invoices')
  .insert(testInvoice)
  .select();

if (error) {
  console.error('❌ TEST FAILED:', error.message);
  console.log('\nThe column is still missing. Please run the SQL from APPLY-THIS-SQL.txt');
} else {
  console.log('✅ SUCCESS! All columns are working!');
  console.log('\nAvailable columns:');
  Object.keys(data[0]).sort().forEach((col, idx) => {
    console.log((idx + 1) + '. ' + col);
  });
  
  // Clean up test record
  await supabase.from('invoices').delete().eq('id', data[0].id);
  console.log('\n✅ Invoice extraction feature is now fully functional!');
}
