import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.z-I1Z4uNZG3gkBXpuOx4X_LDfFRv-6G5g9rbHTK91ys';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

const sql = readFileSync('./supabase/migrations/20251111100000_add_missing_product_categories.sql', 'utf8');

console.log('Adding missing product categories to enum...\n');

// Split by DO blocks and execute separately
const blocks = sql.match(/DO \$\$[\s\S]*?END \$\$;/g);

if (blocks) {
  for (const block of blocks) {
    console.log('Executing block...');
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: block });

      if (error) {
        console.error('Error:', error);
        break;
      } else {
        console.log('✓ Success');
      }
    } catch (err) {
      console.error('Exception:', err.message);
    }
  }
} else {
  // Try executing the whole thing
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✓ Migration completed successfully!');
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

console.log('\nDone!');
process.exit(0);
