import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing Withdrawal Calculation Logic\n');
console.log('=' .repeat(70));

async function testWithdrawalCalculation() {
  console.log('\n📋 Test Scenario (from user requirement):');
  console.log('-'.repeat(70));
  console.log('Treatment starts: Day 6 (2025-11-06)');
  console.log('Medicine 1: 5-day withdrawal, 4-day course');
  console.log('  → Expected: 6 + 4 + 5 + 1 = Day 16 (2025-11-16)');
  console.log('Medicine 2: 6-day withdrawal, 6-day course');
  console.log('  → Expected: 6 + 6 + 6 + 1 = Day 19 (2025-11-19)');
  console.log('Final safe date: Day 19 (maximum of all medicines)\n');

  try {
    // Step 1: Get or create test animal
    console.log('Step 1: Setting up test animal...');
    let { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, tag_no')
      .eq('tag_no', 'TEST-WITHDRAWAL')
      .maybeSingle();

    if (!animal) {
      const { data: newAnimal, error: createError } = await supabase
        .from('animals')
        .insert({
          tag_no: 'TEST-WITHDRAWAL',
          birth_date: '2020-01-01'
        })
        .select()
        .single();

      if (createError) throw createError;
      animal = newAnimal;
      console.log('  ✅ Created test animal:', animal.tag_no);
    } else {
      console.log('  ✅ Using existing test animal:', animal.tag_no);
    }

    // Step 2: Get or create test medicines
    console.log('\nStep 2: Setting up test medicines...');

    let { data: med1 } = await supabase
      .from('products')
      .select('id, name, withdrawal_days_milk, withdrawal_days_meat')
      .eq('name', 'TEST-MED-1')
      .maybeSingle();

    if (!med1) {
      const { data: newMed1, error: med1Error } = await supabase
        .from('products')
        .insert({
          name: 'TEST-MED-1',
          category: 'medicines',
          withdrawal_days_milk: 5,
          withdrawal_days_meat: 5,
          primary_pack_unit: 'ml',
          is_active: true
        })
        .select()
        .single();

      if (med1Error) throw med1Error;
      med1 = newMed1;
      console.log('  ✅ Created Medicine 1: 5-day withdrawal');
    } else {
      console.log('  ✅ Using Medicine 1: 5-day withdrawal');
    }

    let { data: med2 } = await supabase
      .from('products')
      .select('id, name, withdrawal_days_milk, withdrawal_days_meat')
      .eq('name', 'TEST-MED-2')
      .maybeSingle();

    if (!med2) {
      const { data: newMed2, error: med2Error } = await supabase
        .from('products')
        .insert({
          name: 'TEST-MED-2',
          category: 'medicines',
          withdrawal_days_milk: 6,
          withdrawal_days_meat: 6,
          primary_pack_unit: 'ml',
          is_active: true
        })
        .select()
        .single();

      if (med2Error) throw med2Error;
      med2 = newMed2;
      console.log('  ✅ Created Medicine 2: 6-day withdrawal');
    } else {
      console.log('  ✅ Using Medicine 2: 6-day withdrawal');
    }

    // Step 3: Create batches
    console.log('\nStep 3: Setting up batches...');

    const { data: batch1, error: batch1Error } = await supabase
      .from('batches')
      .insert({
        product_id: med1.id,
        lot: 'TEST-BATCH-1',
        received_qty: 1000,
        expiry_date: '2026-12-31'
      })
      .select()
      .single();

    if (batch1Error && batch1Error.code !== '23505') throw batch1Error;
    console.log('  ✅ Batch 1 ready');

    const { data: batch2, error: batch2Error } = await supabase
      .from('batches')
      .insert({
        product_id: med2.id,
        lot: 'TEST-BATCH-2',
        received_qty: 1000,
        expiry_date: '2026-12-31'
      })
      .select()
      .single();

    if (batch2Error && batch2Error.code !== '23505') throw batch2Error;
    console.log('  ✅ Batch 2 ready');

    // Get batch IDs if they already existed
    if (!batch1) {
      const { data: existingBatch1 } = await supabase
        .from('batches')
        .select('id')
        .eq('product_id', med1.id)
        .eq('lot', 'TEST-BATCH-1')
        .single();
      batch1 = existingBatch1;
    }

    if (!batch2) {
      const { data: existingBatch2 } = await supabase
        .from('batches')
        .select('id')
        .eq('product_id', med2.id)
        .eq('lot', 'TEST-BATCH-2')
        .single();
      batch2 = existingBatch2;
    }

    // Step 4: Create treatment
    console.log('\nStep 4: Creating treatment (starts on Day 6 = 2025-11-06)...');
    const { data: treatment, error: treatmentError } = await supabase
      .from('treatments')
      .insert({
        animal_id: animal.id,
        reg_date: '2025-11-06',
        notes: 'Test withdrawal calculation'
      })
      .select()
      .single();

    if (treatmentError) throw treatmentError;
    console.log('  ✅ Treatment created with ID:', treatment.id.slice(0, 8));

    // Step 5: Add courses
    console.log('\nStep 5: Adding medicine courses...');

    // Medicine 1: 4-day course
    const { error: course1Error } = await supabase
      .from('treatment_courses')
      .insert({
        treatment_id: treatment.id,
        product_id: med1.id,
        batch_id: batch1.id,
        days: 4,
        total_dose: 40,
        daily_dose: 10,
        unit: 'ml',
        start_date: '2025-11-06'
      });

    if (course1Error) throw course1Error;
    console.log('  ✅ Medicine 1: 4-day course added');

    // Medicine 2: 6-day course
    const { error: course2Error } = await supabase
      .from('treatment_courses')
      .insert({
        treatment_id: treatment.id,
        product_id: med2.id,
        batch_id: batch2.id,
        days: 6,
        total_dose: 60,
        daily_dose: 10,
        unit: 'ml',
        start_date: '2025-11-06'
      });

    if (course2Error) throw course2Error;
    console.log('  ✅ Medicine 2: 6-day course added');

    // Step 6: Calculate withdrawal dates
    console.log('\nStep 6: Calculating withdrawal dates...');
    const { error: calcError } = await supabase.rpc('calculate_withdrawal_dates', {
      p_treatment_id: treatment.id
    });

    if (calcError) throw calcError;
    console.log('  ✅ Calculation complete');

    // Step 7: Verify results
    console.log('\nStep 7: Verifying results...');
    const { data: result, error: resultError } = await supabase
      .from('treatments')
      .select('reg_date, withdrawal_until_milk, withdrawal_until_meat')
      .eq('id', treatment.id)
      .single();

    if (resultError) throw resultError;

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESULTS:');
    console.log('='.repeat(70));
    console.log(`Treatment Date: ${result.reg_date}`);
    console.log(`Milk Withdrawal: ${result.withdrawal_until_milk}`);
    console.log(`Meat Withdrawal: ${result.withdrawal_until_meat}`);

    console.log('\n' + '='.repeat(70));
    console.log('🎯 VALIDATION:');
    console.log('='.repeat(70));

    const expectedMilk = '2025-11-19';
    const expectedMeat = '2025-11-19';

    const milkMatch = result.withdrawal_until_milk === expectedMilk;
    const meatMatch = result.withdrawal_until_meat === expectedMeat;

    if (milkMatch) {
      console.log('✅ Milk withdrawal date CORRECT: 2025-11-19');
      console.log('   Formula verified: 2025-11-06 (start) + 6 (course) + 6 (withdrawal) + 1 = 2025-11-19');
    } else {
      console.log(`❌ Milk withdrawal date WRONG: Got ${result.withdrawal_until_milk}, Expected ${expectedMilk}`);
    }

    if (meatMatch) {
      console.log('✅ Meat withdrawal date CORRECT: 2025-11-19');
      console.log('   Formula verified: 2025-11-06 (start) + 6 (course) + 6 (withdrawal) + 1 = 2025-11-19');
    } else {
      console.log(`❌ Meat withdrawal date WRONG: Got ${result.withdrawal_until_meat}, Expected ${expectedMeat}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📝 CALCULATION BREAKDOWN:');
    console.log('='.repeat(70));
    console.log('Medicine 1: 2025-11-06 + 4 days + 5 withdrawal + 1 = 2025-11-16');
    console.log('Medicine 2: 2025-11-06 + 6 days + 6 withdrawal + 1 = 2025-11-19');
    console.log('Maximum: 2025-11-19 ✓');

    if (milkMatch && meatMatch) {
      console.log('\n✅ ALL TESTS PASSED! Withdrawal calculation is CORRECT! 🎉');
    } else {
      console.log('\n❌ TESTS FAILED! The migration needs to be applied to the database.');
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Run this SQL in your Supabase SQL Editor:');
      console.log('   File: supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('treatment_courses').delete().eq('treatment_id', treatment.id);
    await supabase.from('treatments').delete().eq('id', treatment.id);
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Details:', error);
  }
}

testWithdrawalCalculation().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
