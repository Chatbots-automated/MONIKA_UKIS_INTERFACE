import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Find the cow
const { data: animal } = await supabase
  .from('animals')
  .select('id, tag_no')
  .eq('tag_no', 'LT000008370189')
  .single();

console.log('Animal:', animal);

if (animal) {
  // Check GEA status
  const { data: geaData } = await supabase
    .from('gea_daily')
    .select('statusas, snapshot_date')
    .eq('animal_id', animal.id)
    .order('snapshot_date', { ascending: false })
    .limit(1);
  
  console.log('\nLatest GEA status:', geaData);

  // Check synchronization visits
  const { data: visits } = await supabase
    .from('animal_visits')
    .select('id, visit_datetime, diagnosis, status, cancelled')
    .eq('animal_id', animal.id)
    .ilike('diagnosis', '%sinchronizacija%')
    .gte('visit_datetime', '2025-12-03')
    .order('visit_datetime', { ascending: true });
  
  console.log('\nSynchronization visits from 2025-12-03:');
  visits?.forEach(v => {
    console.log(`  ${v.visit_datetime} - Status: ${v.status}, Cancelled: ${v.cancelled}, Diagnosis: ${v.diagnosis}`);
  });
}
