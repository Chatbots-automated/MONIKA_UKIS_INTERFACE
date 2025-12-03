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
    .select('id, visit_datetime, status, sync_step_id')
    .eq('animal_id', animal.id)
    .gte('visit_datetime', '2025-12-03')
    .order('visit_datetime', { ascending: true })
    .limit(3);
  
  console.log('Checking first 3 visits:\n');
  
  for (const visit of visits) {
    console.log('Visit:', visit.visit_datetime);
    console.log('  Status:', visit.status);
    console.log('  sync_step_id:', visit.sync_step_id);
    
    if (visit.sync_step_id) {
      const { data: step } = await supabase
        .from('synchronization_steps')
        .select('id, synchronization_id, step_name, completed')
        .eq('id', visit.sync_step_id)
        .single();
      
      if (step) {
        console.log('  Step:', step.step_name, '(completed:', step.completed, ')');
        console.log('  Sync ID:', step.synchronization_id);
        
        const { data: sync } = await supabase
          .from('animal_synchronizations')
          .select('status')
          .eq('id', step.synchronization_id)
          .single();
        
        if (sync) {
          console.log('  Sync Status:', sync.status);
        }
      }
    }
    console.log('');
  }
}
