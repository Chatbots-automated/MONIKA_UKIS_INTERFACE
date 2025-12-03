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
    .from('synchronizations')
    .select('*')
    .eq('animal_id', animal.id)
    .gte('scheduled_date', '2025-12-03')
    .order('scheduled_date', { ascending: true });
  
  console.log('Synchronizations from 2025-12-03:');
  if (syncs && syncs.length > 0) {
    syncs.forEach(s => {
      console.log('\nDate:', s.scheduled_date);
      console.log('  Description:', s.description);
      console.log('  Status:', s.status);
      console.log('  Cancelled:', s.cancelled);
      console.log('  Protocol ID:', s.protocol_id);
    });
    console.log('\nTotal:', syncs.length);
  } else {
    console.log('  None found');
  }
}
