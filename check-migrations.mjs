import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

// Check if invoices table exists and its columns
const { data: columnsData, error: colError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices'
    ORDER BY ordinal_position;
  `
});

if (colError) {
  console.error('Error checking columns:', colError);
} else {
  console.log('Columns in invoices table:');
  console.log(columnsData);
}
