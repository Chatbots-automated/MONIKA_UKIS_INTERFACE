import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDocTitleColumn() {
  console.log('Checking if doc_title column exists in invoices table...');

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

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Error adding doc_title column:', error);
    process.exit(1);
  }

  console.log('✓ Successfully added doc_title column to invoices table');
}

addDocTitleColumn();
