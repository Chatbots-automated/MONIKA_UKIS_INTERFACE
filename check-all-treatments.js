import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllTreatments() {
  console.log('🔬 Checking ALL treatments and their stock deductions...\n');

  // Get total count of treatments
  const { count: totalTreatments } = await supabase
    .from('treatments')
    .select('*', { count: 'exact', head: true });

  console.log(`Total treatments in database: ${totalTreatments || 0}\n`);

  if (totalTreatments === 0) {
    console.log('❌ No treatments found!');
    return;
  }

  // Get recent treatments
  const { data: recentTreatments } = await supabase
    .from('treatments')
    .select(`
      id,
      animal_id,
      product_id,
      amount,
      treatment_date,
      batch_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  console.log(`Analyzing ${recentTreatments?.length || 0} most recent treatments:\n`);

  let withUsageItems = 0;
  let withoutUsageItems = 0;
  let withBatchMissingUsage = [];
  let withoutBatchMissingUsage = [];

  for (const treatment of recentTreatments || []) {
    const { data: usageItems } = await supabase
      .from('usage_items')
      .select('id, qty')
      .eq('treatment_id', treatment.id);

    const hasUsage = usageItems && usageItems.length > 0;

    if (hasUsage) {
      withUsageItems++;
    } else {
      withoutUsageItems++;
      if (treatment.batch_id) {
        withBatchMissingUsage.push(treatment);
      } else {
        withoutBatchMissingUsage.push(treatment);
      }
    }
  }

  console.log(`📊 RESULTS:`);
  console.log(`   Treatments WITH usage_items: ${withUsageItems} ✅`);
  console.log(`   Treatments WITHOUT usage_items: ${withoutUsageItems} ❌\n`);

  if (withoutUsageItems > 0) {
    console.log(`⚠️  MISSING USAGE_ITEMS BREAKDOWN:`);
    console.log(`   With batch_id: ${withBatchMissingUsage.length}`);
    console.log(`   Without batch_id: ${withoutBatchMissingUsage.length}\n`);

    if (withBatchMissingUsage.length > 0) {
      console.log(`   Examples WITH batch_id (should have deducted):`);
      for (const t of withBatchMissingUsage.slice(0, 5)) {
        const { data: product } = await supabase
          .from('products')
          .select('name, category')
          .eq('id', t.product_id)
          .single();

        console.log(`      ${t.treatment_date}: ${product?.name} (${t.amount} units) - ${product?.category}`);
      }
    }

    if (withoutBatchMissingUsage.length > 0) {
      console.log(`\n   Examples WITHOUT batch_id (expected - no batch selected):`);
      for (const t of withoutBatchMissingUsage.slice(0, 5)) {
        const { data: product } = await supabase
          .from('products')
          .select('name, category')
          .eq('id', t.product_id)
          .single();

        console.log(`      ${t.treatment_date}: ${product?.name} (${t.amount} units) - ${product?.category}`);
      }
    }
  }

  // Check if there's a trigger that creates usage_items
  console.log(`\n\n🔍 Checking for stock deduction triggers...\n`);

  const { data: triggers } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          trigger_name,
          event_manipulation,
          event_object_table,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'treatments'
        ORDER BY trigger_name;
      `
    }).catch(() => ({ data: null }));

  if (triggers && triggers.length > 0) {
    console.log(`Found ${triggers.length} triggers on treatments table:`);
    for (const trigger of triggers) {
      console.log(`   ${trigger.trigger_name} (${trigger.event_manipulation})`);
    }
  } else {
    console.log('⚠️  Could not query triggers (permission issue or no triggers exist)');
  }

  // Check how usage_items are created - look at the source
  console.log(`\n🔍 Checking usage_items source (purpose column)...\n`);

  const { data: usageItemSample } = await supabase
    .from('usage_items')
    .select('purpose, treatment_id, vaccination_id, course_medication_id')
    .not('treatment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (usageItemSample && usageItemSample.length > 0) {
    console.log(`Sample of treatment-related usage_items:`);
    for (const item of usageItemSample) {
      console.log(`   Purpose: ${item.purpose || 'NULL'}`);
    }
  } else {
    console.log('❌ No treatment-related usage_items found!');
  }
}

checkAllTreatments().catch(console.error);
