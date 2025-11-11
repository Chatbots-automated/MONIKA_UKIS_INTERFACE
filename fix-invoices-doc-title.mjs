import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.z-I1Z4uNZG3gkBXpuOx4X_LDfFRv-6G5g9rbHTK91ys';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
DO $$
BEGIN
  -- Add doc_title column to invoices if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'doc_title'
  ) THEN
    ALTER TABLE invoices ADD COLUMN doc_title text DEFAULT 'Invoice';
    RAISE NOTICE 'Added doc_title column to invoices table';
  ELSE
    RAISE NOTICE 'doc_title column already exists in invoices table';
  END IF;
END $$;
`;

console.log('Adding doc_title column to invoices table...');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✓ Successfully added doc_title column!');
  }
} catch (err) {
  console.error('Exception:', err);
}
