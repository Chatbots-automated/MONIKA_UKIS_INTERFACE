import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

// Try to insert a test invoice to see what columns are available
const testInvoice = {
  invoice_number: 'TEST-001',
  invoice_date: '2025-11-11',
  doc_title: 'Test Invoice',
  supplier_name: 'Test Supplier',
  currency: 'EUR',
  total_net: 100,
  total_vat: 21,
  total_gross: 121,
  vat_rate: 21,
  pdf_filename: 'test.pdf'
};

console.log('Attempting to insert test invoice with pdf_filename...');
const { data, error } = await supabase
  .from('invoices')
  .insert(testInvoice)
  .select();

if (error) {
  console.error('Error:', error);
  console.log('\n--- Checking what columns exist ---');
  
  // Try without pdf_filename
  const { data: data2, error: error2 } = await supabase
    .from('invoices')
    .insert({
      invoice_number: 'TEST-002',
      invoice_date: '2025-11-11',
      supplier_name: 'Test'
    })
    .select();
    
  if (error2) {
    console.error('Still error:', error2);
  } else {
    console.log('Success without pdf_filename! Available columns:', Object.keys(data2[0]));
  }
} else {
  console.log('Success! Invoice created:', data);
  console.log('Available columns:', Object.keys(data[0]));
}
