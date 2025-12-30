const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking usage_items table schema...\n');

  // Check current usage_items records
  const { data: sampleItems, error: sampleError } = await supabase
    .from('usage_items')
    .select('*')
    .limit(5);

  if (sampleError) {
    console.error('Error fetching sample items:', sampleError);
  } else {
    console.log('Sample usage_items records:');
    console.log(JSON.stringify(sampleItems, null, 2));
    console.log('\n');
  }

  // Check if any usage_items have NULL treatment_id
  const { data: nullTreatments, error: nullError } = await supabase
    .from('usage_items')
    .select('id, treatment_id, product_id, vaccination_id')
    .is('treatment_id', null);

  if (nullError) {
    console.error('Error checking null treatments:', nullError);
  } else {
    console.log(`Usage_items with NULL treatment_id: ${nullTreatments?.length || 0}`);
    if (nullTreatments && nullTreatments.length > 0) {
      console.log(JSON.stringify(nullTreatments.slice(0, 3), null, 2));
    }
    console.log('\n');
  }

  // Check vaccinations
  const { data: vaccinations, error: vacError } = await supabase
    .from('vaccinations')
    .select('id, product_id, dose_amount, batch_id')
    .limit(5);

  if (vacError) {
    console.error('Error fetching vaccinations:', vacError);
  } else {
    console.log(`Total vaccinations (sample): ${vaccinations?.length || 0}`);
    console.log(JSON.stringify(vaccinations, null, 2));
    console.log('\n');
  }

  // Check if vaccination_id column exists
  const { data: withVacId, error: vacIdError } = await supabase
    .from('usage_items')
    .select('vaccination_id')
    .limit(1);

  if (vacIdError) {
    if (vacIdError.message.includes('vaccination_id')) {
      console.log('❌ vaccination_id column does NOT exist in usage_items\n');
    } else {
      console.error('Error checking vaccination_id:', vacIdError);
    }
  } else {
    console.log('✅ vaccination_id column EXISTS in usage_items\n');
  }

  console.log('🎯 Analysis complete!\n');
}

checkSchema();
