import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function testInsert() {
  console.log('Testing visit insert with auth...\n');

  // First check if we can read animals
  const { data: animals, error: animalsError } = await supabase
    .from('animals')
    .select('id')
    .limit(1);

  console.log('=== ANIMALS CHECK ===');
  if (animalsError) {
    console.error('Cannot read animals:', animalsError);
    return;
  }
  console.log('Can read animals:', animals);

  if (!animals || animals.length === 0) {
    console.log('No animals found to test with');
    return;
  }

  const animalId = animals[0].id;

  // Check current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log('\n=== CURRENT USER ===');
  if (userError) {
    console.error('User error:', userError);
  }
  console.log('User:', user ? user.email : 'NOT AUTHENTICATED');

  // Try to insert a visit
  console.log('\n=== TRYING TO INSERT VISIT ===');
  const { data: visit, error: visitError } = await supabase
    .from('animal_visits')
    .insert({
      animal_id: animalId,
      visit_datetime: new Date().toISOString(),
      procedures: ['Gydymas'],
      status: 'Planuojamas',
      vet_name: 'Test Vet'
    })
    .select();

  if (visitError) {
    console.error('Visit insert error:');
    console.error('Code:', visitError.code);
    console.error('Message:', visitError.message);
    console.error('Details:', visitError.details);
    console.error('Hint:', visitError.hint);
    console.error('Full error:', JSON.stringify(visitError, null, 2));
  } else {
    console.log('Success!', visit);
  }

  // Try to read visits
  console.log('\n=== TRYING TO READ VISITS ===');
  const { data: visits, error: readError } = await supabase
    .from('animal_visits')
    .select('*')
    .limit(5);

  if (readError) {
    console.error('Read error:', readError);
  } else {
    console.log('Can read visits:', visits.length, 'records');
  }
}

testInsert().catch(console.error);
