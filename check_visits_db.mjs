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

console.log('=== CHECKING ANIMAL VISITS ===');

if (animal) {
  const { data: visits } = await supabase
    .from('animal_visits')
    .select('*')
    .eq('animal_id', animal.id)
    .gte('visit_datetime', '2025-12-03')
    .order('visit_datetime', { ascending: true });
  
  console.log('\nAnimal Visits from 2025-12-03:');
  if (visits && visits.length > 0) {
    visits.forEach(v => {
      console.log('\n  Date:', v.visit_datetime);
      console.log('  Diagnosis:', v.diagnosis);
      console.log('  Status:', v.status);
      console.log('  sync_step_id:', v.sync_step_id);
    });
    console.log('\nTotal:', visits.length, 'visits');
  } else {
    console.log('  No visits found');
  }

  const { data: syncs } = await supabase
    .from('animal_synchronizations')
    .select('*')
    .eq('animal_id', animal.id)
    .order('created_at', { ascending: false });
  
  console.log('\n\n=== ANIMAL SYNCHRONIZATIONS ===');
  if (syncs && syncs.length > 0) {
    for (const sync of syncs) {
      console.log('\nSync ID:', sync.id);
      console.log('  Status:', sync.status);
      console.log('  Protocol:', sync.protocol_id);
      console.log('  Start:', sync.start_date);
      
      const { data: steps } = await supabase
        .from('synchronization_steps')
        .select('*')
        .eq('synchronization_id', sync.id)
        .gte('scheduled_date', '2025-12-03')
        .order('scheduled_date', { ascending: true });
      
      if (steps && steps.length > 0) {
        console.log('  Steps from 2025-12-03:', steps.length);
        steps.forEach(step => {
          console.log('    -', step.scheduled_date, ':', step.step_name, '(Completed:', step.completed, ')');
        });
      }
    }
  }
}
