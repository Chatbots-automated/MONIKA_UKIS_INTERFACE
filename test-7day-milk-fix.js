import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testCalculations() {
  console.log('Testing 7-Day Milk Loss Calculations\n');
  console.log('=====================================\n');

  // Test animal: LT000009135825
  const testTag = 'LT000009135825';

  // Get animal ID
  const { data: animal, error: animalError } = await supabase
    .from('animals')
    .select('id, tag_no')
    .eq('tag_no', testTag)
    .single();

  if (animalError || !animal) {
    console.error('Could not find animal:', testTag);
    return;
  }

  console.log(`Testing calculations for: ${animal.tag_no}`);
  console.log(`Animal ID: ${animal.id}\n`);

  // Get recent GEA daily data to show what we're working with
  const { data: geaData, error: geaError } = await supabase
    .from('gea_daily')
    .select('snapshot_date, milk_avg, m1_qty, m2_qty, m3_qty, m4_qty, m5_qty')
    .eq('animal_id', animal.id)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  if (geaError) {
    console.error('Error fetching GEA data:', geaError);
    return;
  }

  console.log('Recent GEA Daily Data (last 10 days):');
  console.log('=====================================');
  geaData.forEach(day => {
    const totalDaily = (day.m1_qty || 0) + (day.m2_qty || 0) + (day.m3_qty || 0) + (day.m4_qty || 0) + (day.m5_qty || 0);
    console.log(`${day.snapshot_date}: milk_avg=${day.milk_avg}kg, actual_total=${totalDaily.toFixed(2)}kg`);
  });

  // Calculate 7-day average manually to verify
  const last7Days = geaData.slice(0, 7);
  const sum7day = last7Days.reduce((sum, day) => {
    return sum + (day.m1_qty || 0) + (day.m2_qty || 0) + (day.m3_qty || 0) + (day.m4_qty || 0) + (day.m5_qty || 0);
  }, 0);
  const manual7dayAvg = sum7day / last7Days.length;

  console.log(`\nManual 7-Day Calculation:`);
  console.log(`  Total from ${last7Days.length} days: ${sum7day.toFixed(2)}kg`);
  console.log(`  Average: ${manual7dayAvg.toFixed(2)}kg/day`);

  // Test the updated function
  console.log('\n=====================================');
  console.log('Testing Updated Functions:');
  console.log('=====================================\n');

  const testDate = new Date().toISOString().split('T')[0];

  // Test calculate_average_daily_milk
  const { data: avgResult, error: avgError } = await supabase
    .rpc('calculate_average_daily_milk', {
      p_animal_id: animal.id,
      p_before_date: testDate
    });

  if (avgError) {
    console.error('Error calling calculate_average_daily_milk:', avgError);
  } else {
    console.log(`calculate_average_daily_milk(${testDate}):`);
    console.log(`  Result: ${avgResult}kg/day`);
    console.log(`  Expected (manual): ${manual7dayAvg.toFixed(2)}kg/day`);
    console.log(`  Match: ${Math.abs(avgResult - manual7dayAvg) < 0.01 ? '✅ YES' : '❌ NO'}`);
  }

  // Test get_animal_avg_milk_at_date
  const { data: atDateResult, error: atDateError } = await supabase
    .rpc('get_animal_avg_milk_at_date', {
      p_animal_id: animal.id,
      p_date: testDate
    });

  if (atDateError) {
    console.error('\nError calling get_animal_avg_milk_at_date:', atDateError);
  } else {
    console.log(`\nget_animal_avg_milk_at_date(${testDate}):`);
    console.log(`  Result: ${atDateResult}kg/day`);
    console.log(`  Expected (manual): ${manual7dayAvg.toFixed(2)}kg/day`);
    console.log(`  Match: ${Math.abs(atDateResult - manual7dayAvg) < 0.01 ? '✅ YES' : '❌ NO'}`);
  }

  // Test synchronization milk loss view
  console.log('\n=====================================');
  console.log('Testing Synchronization Milk Loss:');
  console.log('=====================================\n');

  const { data: syncData, error: syncError } = await supabase
    .from('animal_milk_loss_by_synchronization')
    .select('*')
    .eq('animal_id', animal.id)
    .limit(1);

  if (syncError) {
    console.log('No active synchronizations found for this animal');
  } else if (syncData && syncData.length > 0) {
    const sync = syncData[0];
    console.log(`Sync ID: ${sync.sync_id}`);
    console.log(`Status: ${sync.sync_status}`);
    console.log(`Period: ${sync.sync_start} to ${sync.sync_end}`);
    console.log(`Loss Days: ${sync.loss_days}`);
    console.log(`Avg Daily Milk: ${sync.avg_daily_milk_kg}kg/day`);
    console.log(`Total Milk Lost: ${sync.total_milk_lost_kg}kg`);
    console.log(`Financial Loss: €${sync.milk_loss_value_eur}`);
  }

  // Test treatment milk loss view
  console.log('\n=====================================');
  console.log('Testing Treatment Milk Loss:');
  console.log('=====================================\n');

  const { data: treatmentData, error: treatmentError } = await supabase
    .from('treatment_milk_loss_summary')
    .select('*')
    .eq('animal_id', animal.id)
    .limit(1);

  if (treatmentError) {
    console.log('No treatments with withdrawal periods found for this animal');
  } else if (treatmentData && treatmentData.length > 0) {
    const treatment = treatmentData[0];
    console.log(`Treatment ID: ${treatment.treatment_id}`);
    console.log(`Date: ${treatment.treatment_date}`);
    console.log(`Withdrawal Until: ${treatment.withdrawal_until_milk}`);
    console.log(`Withdrawal Days: ${treatment.withdrawal_days}`);
    console.log(`Avg Daily Milk: ${treatment.avg_daily_milk_kg}kg/day`);
    console.log(`Total Milk Lost: ${treatment.total_milk_lost_kg}kg`);
    console.log(`Financial Loss: €${treatment.total_value_lost_eur}`);
  }

  console.log('\n=====================================');
  console.log('Test Complete!');
  console.log('=====================================');
}

testCalculations();
