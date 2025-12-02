import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data: suppliers, error } = await supabase
  .from('suppliers')
  .select('id, name')
  .limit(10);

console.log('Suppliers count:', suppliers?.length || 0);
if (error) {
  console.error('Suppliers error:', error);
} else {
  console.log('Sample suppliers:', suppliers);
}
