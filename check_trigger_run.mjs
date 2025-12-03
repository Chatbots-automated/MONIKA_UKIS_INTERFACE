import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Try to manually call the cancellation function
const { data: animal } = await supabase
  .from('animals')
  .select('id')
  .eq('tag_no', 'LT000008370189')
  .single();

if (animal) {
  console.log('Testing trigger function manually...');
  
  const { data, error } = await supabase.rpc('cancel_animal_synchronization_protocols', {
    p_animal_id: animal.id
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', data, 'protocols cancelled');
  }
  
  // Check visits again
  const { data: visits } = await supabase
    .from('animal_visits')
    .select('id, visit_datetime, status, sync_step_id')
    .eq('animal_id', animal.id)
    .gte('visit_datetime', '2025-12-03')
    .order('visit_datetime', { ascending: true });
  
  console.log('\nVisits after manual trigger:');
  visits?.forEach(v => {
    console.log('  ', v.visit_datetime, '->', v.status);
  });
}
