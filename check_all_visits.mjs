import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data: animal } = await supabase
  .from('animals')
  .select('id')
  .eq('tag_no', 'LT000008370189')
  .single();

if (animal) {
  const { data: allVisits } = await supabase
    .from('animal_visits')
    .select('id, visit_datetime, diagnosis, status, cancelled')
    .eq('animal_id', animal.id)
    .gte('visit_datetime', '2025-12-03')
    .order('visit_datetime', { ascending: true });
  
  console.log('All visits from 2025-12-03:');
  if (allVisits) {
    allVisits.forEach(v => {
      console.log('  Date:', v.visit_datetime);
      console.log('    Diagnosis:', v.diagnosis);
      console.log('    Status:', v.status, 'Cancelled:', v.cancelled);
    });
    console.log('Total:', allVisits.length, 'visits');
  }
}
