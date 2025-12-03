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
  const { data: protocols } = await supabase
    .from('synchronization_protocols')
    .select('*')
    .eq('animal_id', animal.id)
    .order('created_at', { ascending: false });
  
  console.log('Synchronization protocols:');
  if (protocols && protocols.length > 0) {
    protocols.forEach(p => {
      console.log('\nProtocol ID:', p.id);
      console.log('  Status:', p.status);
      console.log('  Cancelled:', p.cancelled);
      console.log('  Started:', p.started_at);
      console.log('  Created:', p.created_at);
    });
  } else {
    console.log('  None found');
  }
}
