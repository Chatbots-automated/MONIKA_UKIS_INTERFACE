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
  const { data: visits } = await supabase
    .from('animal_visits')
    .select('id, visit_datetime, diagnosis, status, sync_step_id')
    .eq('animal_id', animal.id)
    .gte('visit_datetime', '2025-12-03')
    .order('visit_datetime', { ascending: true });
  
  console.log('All visits from 2025-12-03:');
  if (visits && visits.length > 0) {
    visits.forEach(v => {
      console.log('\nDate:', v.visit_datetime);
      console.log('  Diagnosis:', v.diagnosis);
      console.log('  Status:', v.status);
      console.log('  sync_step_id:', v.sync_step_id);
    });
    console.log('\nTotal:', visits.length, 'visits');
  } else {
    console.log('  None found');
  }
}
