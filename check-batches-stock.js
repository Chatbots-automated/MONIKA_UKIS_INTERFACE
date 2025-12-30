import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkBatchesStock() {
  console.log('🔬 Checking BioBos RCC stock (using batches table like Inventory component)...\n');

  // Find BioBos RCC
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('name', 'BioBos RCC inj.susp. 10 ml')
    .single();

  if (!product) {
    console.log('❌ Product not found');
    return;
  }

  console.log(`📦 ${product.name} (${product.id})\n`);

  // Get all batches for this product
  const { data: batches } = await supabase
    .from('batches')
    .select('*')
    .eq('product_id', product.id)
    .order('created_at', { ascending: false });

  console.log(`📋 BATCHES (${batches?.length || 0} total):\n`);

  let totalInventoryStock = 0;

  for (const batch of batches || []) {
    // Get usage for this batch
    const { data: usage } = await supabase
      .from('usage_items')
      .select('qty, purpose, treatment_id, vaccination_id')
      .eq('batch_id', batch.id);

    const totalUsed = usage?.reduce((sum, u) => sum + Number(u.qty), 0) || 0;
    const onHand = (batch.received_qty || 0) - totalUsed;

    const treatmentUsage = usage?.filter(u => u.treatment_id).reduce((sum, u) => sum + Number(u.qty), 0) || 0;
    const vaccinationUsage = usage?.filter(u => u.vaccination_id).reduce((sum, u) => sum + Number(u.qty), 0) || 0;

    console.log(`   Batch: ${batch.lot || 'N/A'}`);
    console.log(`      Received: ${batch.received_qty || 0} ml`);
    console.log(`      Used (treatments): ${treatmentUsage} ml`);
    console.log(`      Used (vaccinations): ${vaccinationUsage} ml`);
    console.log(`      Total used: ${totalUsed} ml`);
    console.log(`      On hand: ${onHand} ml ${onHand > 0 ? '✅' : '⚠️'}`);
    console.log('');

    if (onHand > 0) {
      totalInventoryStock += onHand;
    }
  }

  console.log(`\n📊 INVENTORY TAB CALCULATION (batches with on_hand > 0):`);
  console.log(`   Total stock shown: ${totalInventoryStock} ml\n`);

  // Now check ProductUsageAnalysis calculation (uses atsargos table)
  const { data: atsargos } = await supabase
    .from('atsargos')
    .select('qty')
    .eq('product_id', product.id);

  const totalReceived = atsargos?.reduce((sum, a) => sum + Number(a.qty), 0) || 0;

  const { data: allUsage } = await supabase
    .from('usage_items')
    .select('qty')
    .eq('product_id', product.id);

  const totalUsed = allUsage?.reduce((sum, u) => sum + Number(u.qty), 0) || 0;

  const usageAnalysisStock = totalReceived - totalUsed;

  console.log(`📊 PRODUCT USAGE ANALYSIS CALCULATION (atsargos table):`);
  console.log(`   Received (atsargos): ${totalReceived} ml`);
  console.log(`   Used (usage_items): ${totalUsed} ml`);
  console.log(`   Stock: ${usageAnalysisStock} ml\n`);

  console.log(`\n🔍 COMPARISON:`);
  console.log(`   Inventory tab (batches): ${totalInventoryStock} ml`);
  console.log(`   Usage analysis (atsargos): ${usageAnalysisStock} ml`);
  console.log(`   Discrepancy: ${Math.abs(totalInventoryStock - usageAnalysisStock)} ml`);

  if (totalInventoryStock !== usageAnalysisStock) {
    console.log(`\n⚠️  MISMATCH DETECTED!`);
    console.log(`   This happens when:`);
    console.log(`   - batches.received_qty ≠ sum(atsargos.qty) for the same product`);
    console.log(`   - OR usage_items have different batch_id vs NULL batch_id`);
  }

  // Check if there are usage_items with NULL batch_id
  const { data: nullBatchUsage } = await supabase
    .from('usage_items')
    .select('qty, purpose, vaccination_id')
    .eq('product_id', product.id)
    .is('batch_id', null);

  if (nullBatchUsage && nullBatchUsage.length > 0) {
    const nullBatchQty = nullBatchUsage.reduce((sum, u) => sum + Number(u.qty), 0);
    console.log(`\n⚠️  Found ${nullBatchUsage.length} usage_items with NULL batch_id (${nullBatchQty} ml)`);
    console.log(`   These are counted in Usage Analysis but NOT in Inventory tab!`);
  }
}

checkBatchesStock().catch(console.error);
