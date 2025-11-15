import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testOldMethod() {
  console.log('Testing OLD method (N+1 queries)...\n');
  const startTime = Date.now();

  const { data: batchValue } = await supabase
    .from('batches')
    .select('id, purchase_price, received_qty');

  let totalValue = 0;
  let queryCount = 1; // Initial query

  if (batchValue) {
    for (const batch of batchValue) {
      const { data: usageData } = await supabase
        .from('usage_items')
        .select('qty')
        .eq('batch_id', batch.id);

      queryCount++;

      const totalUsed = usageData?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
      const onHand = (batch.received_qty || 0) - totalUsed;
      const unitPrice = batch.received_qty > 0 ? (batch.purchase_price || 0) / batch.received_qty : 0;
      const batchValue = unitPrice * onHand;
      totalValue += batchValue;
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Total batches: ${batchValue?.length || 0}`);
  console.log(`Total queries: ${queryCount}`);
  console.log(`Total value: €${totalValue.toFixed(2)}`);
  console.log(`Time taken: ${duration}ms`);
  console.log(`Average per query: ${(duration / queryCount).toFixed(2)}ms\n`);

  return { duration, queryCount, totalValue };
}

async function testNewMethod() {
  console.log('Testing NEW method (2 optimized queries instead of N+1)...\n');
  const startTime = Date.now();

  // Query 1: Get all batches
  const { data: batchValue } = await supabase
    .from('batches')
    .select('id, purchase_price, received_qty');

  // Query 2: Get ALL usage data at once (instead of N queries)
  const { data: allUsageData } = await supabase
    .from('usage_items')
    .select('batch_id, qty');

  let queryCount = 2; // Two queries total

  // Create usage map
  const usageByBatch = new Map();
  allUsageData?.forEach(item => {
    const batchId = item.batch_id;
    const currentUsage = usageByBatch.get(batchId) || 0;
    usageByBatch.set(batchId, currentUsage + (item.qty || 0));
  });

  // Calculate total value
  let totalValue = 0;
  if (batchValue) {
    for (const batch of batchValue) {
      const totalUsed = usageByBatch.get(batch.id) || 0;
      const onHand = (batch.received_qty || 0) - totalUsed;
      const unitPrice = batch.received_qty > 0 ? (batch.purchase_price || 0) / batch.received_qty : 0;
      const batchValue = unitPrice * onHand;
      totalValue += batchValue;
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Total batches: ${batchValue?.length || 0}`);
  console.log(`Total queries: ${queryCount}`);
  console.log(`Total value: €${totalValue.toFixed(2)}`);
  console.log(`Time taken: ${duration}ms\n`);

  return { duration, queryCount, totalValue };
}

async function main() {
  console.log('='.repeat(60));
  console.log('DASHBOARD PERFORMANCE TEST');
  console.log('='.repeat(60));
  console.log();

  const oldResults = await testOldMethod();
  console.log('-'.repeat(60));
  console.log();
  const newResults = await testNewMethod();

  console.log('='.repeat(60));
  console.log('RESULTS COMPARISON');
  console.log('='.repeat(60));
  console.log();
  console.log(`Old method: ${oldResults.queryCount} queries in ${oldResults.duration}ms`);
  console.log(`New method: ${newResults.queryCount} query in ${newResults.duration}ms`);
  console.log();
  console.log(`Speed improvement: ${(oldResults.duration / newResults.duration).toFixed(2)}x faster`);
  console.log(`Time saved: ${(oldResults.duration - newResults.duration)}ms (${((1 - newResults.duration / oldResults.duration) * 100).toFixed(1)}% faster)`);
  console.log(`Queries reduced: ${oldResults.queryCount - newResults.queryCount} queries eliminated`);
}

main().catch(console.error);
