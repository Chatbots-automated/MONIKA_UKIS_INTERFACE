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
  console.log('Animal ID:', animal.id);
  
  const { data: animalSyncs, error } = await supabase
    .from('animal_synchronizations')
    .select('*')
    .eq('animal_id', animal.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\nAnimal synchronizations:');
    if (animalSyncs && animalSyncs.length > 0) {
      animalSyncs.forEach(s => {
        console.log('\nID:', s.id);
        console.log('  Status:', s.status);
        console.log('  Started:', s.started_at);
        console.log('  Protocol:', s.protocol_template_id);
      });
    } else {
      console.log('  None found');
    }
  }
}
