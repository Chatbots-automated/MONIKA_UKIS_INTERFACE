import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data: batches, error } = await supabase
  .from('batches')
  .select('*')
  .limit(3);

console.log('Sample batch structure:');
if (error) {
  console.error('Error:', error);
} else {
  console.log(JSON.stringify(batches, null, 2));
}
