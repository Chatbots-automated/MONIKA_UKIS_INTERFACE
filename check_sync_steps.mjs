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
  const { data: syncs } = await supabase
    .from('animal_synchronizations')
    .select('id, status')
    .eq('animal_id', animal.id);
  
  console.log('Synchronizations:', syncs);
  
  if (syncs && syncs.length > 0) {
    for (const sync of syncs) {
      const { data: steps } = await supabase
        .from('synchronization_steps')
        .select('*')
        .eq('synchronization_id', sync.id)
        .gte('scheduled_date', '2025-12-03')
        .order('scheduled_date', { ascending: true });
      
      console.log(`\nSteps for sync ${sync.id} (${sync.status}):`);
      if (steps && steps.length > 0) {
        steps.forEach(step => {
          console.log(`  ${step.scheduled_date} - ${step.description}`);
          console.log(`    Completed: ${step.completed}`);
        });
      } else {
        console.log('  None found');
      }
    }
  }
}
