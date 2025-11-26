import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyFix() {
  try {
    console.log('Reading SQL fix file...');
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'fix_visit_medications.sql'),
      'utf8'
    );

    console.log('Applying fix to database...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('Error applying fix:', error);

      // Try alternative method using direct query
      console.log('Trying direct query method...');
      const { data: data2, error: error2 } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);

      if (error2) {
        console.error('Database connection error:', error2);
      } else {
        console.log('Database connected successfully, but exec_sql function not available.');
        console.log('\nPlease run the SQL manually in Supabase Dashboard:');
        console.log('1. Go to https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor');
        console.log('2. Open SQL Editor');
        console.log('3. Copy the contents of fix_visit_medications.sql');
        console.log('4. Paste and run the SQL');
      }
      process.exit(1);
    }

    console.log('✅ Fix applied successfully!');
    console.log('The visit completion function now correctly uses the batches table.');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyFix();
