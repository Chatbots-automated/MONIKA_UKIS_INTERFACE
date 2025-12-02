import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Check if we have data in the tables
const { data: usageItems, error: uiError } = await supabase
  .from('usage_items')
  .select('id, product_id, batch_id, qty')
  .limit(5);

console.log('Usage items sample:', usageItems?.length || 0, 'records');
if (uiError) console.error('Usage items error:', uiError);

const { data: vaccinations, error: vError } = await supabase
  .from('vaccinations')
  .select('id, product_id, batch_id')
  .limit(5);

console.log('Vaccinations sample:', vaccinations?.length || 0, 'records');
if (vError) console.error('Vaccinations error:', vError);

const { data: visits, error: visitError } = await supabase
  .from('animal_visits')
  .select('id, planned_medications')
  .not('planned_medications', 'is', null)
  .limit(5);

console.log('Visits with planned meds:', visits?.length || 0, 'records');
if (visitError) console.error('Visits error:', visitError);

const { data: products, error: pError } = await supabase
  .from('products')
  .select('id, name')
  .limit(5);

console.log('Products sample:', products?.length || 0, 'records');
if (pError) console.error('Products error:', pError);

const { data: batches, error: bError } = await supabase
  .from('batches')
  .select('id, purchase_price, received_qty')
  .limit(5);

console.log('Batches sample:', batches?.length || 0, 'records');
if (bError) console.error('Batches error:', bError);
