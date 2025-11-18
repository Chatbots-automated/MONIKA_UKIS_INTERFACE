import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('\n📊 Checking current table structure...');

  const { data, error } = await supabase
    .from('animal_visits')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Current columns:', Object.keys(data[0] || {}));
  console.log('\n✅ Need to add these columns:');
  console.log('  - planned_medications (jsonb)');
  console.log('  - medications_processed (boolean)');
  console.log('  - related_visit_id (uuid)');
  console.log('\n⚠️  Please run the migration SQL manually in Supabase dashboard');
  console.log('    SQL Editor → New Query → Paste migration content');
}

checkColumns().catch(console.error);
