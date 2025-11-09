import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRecentBatches() {
  console.log('Checking recent batches...\n');

  // Get the 5 most recent batches
  const { data: batches, error: batchError } = await supabase
    .from('batches')
    .select(`
      id,
      product_id,
      lot,
      received_qty,
      package_size,
      package_count,
      created_at,
      products(id, name, category, primary_pack_unit)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (batchError) {
    console.error('Error fetching batches:', batchError);
    return;
  }

  console.log(`Found ${batches.length} recent batches:\n`);

  for (const batch of batches) {
    console.log('='.repeat(60));
    console.log(`Batch ID: ${batch.id}`);
    console.log(`Product ID: ${batch.product_id}`);
    console.log(`Product Name: ${batch.products?.name || 'NOT FOUND'}`);
    console.log(`Category: ${batch.products?.category || 'N/A'}`);
    console.log(`Unit: ${batch.products?.primary_pack_unit || 'N/A'}`);
    console.log(`Lot: ${batch.lot || 'N/A'}`);
    console.log(`Package Size: ${batch.package_size || 'N/A'}`);
    console.log(`Package Count: ${batch.package_count || 'N/A'}`);
    console.log(`Received Qty: ${batch.received_qty || 'N/A'}`);
    console.log(`Created: ${batch.created_at}`);

    // Check usage for this batch
    const { data: usage } = await supabase
      .from('usage_items')
      .select('qty')
      .eq('batch_id', batch.id);

    const totalUsed = usage?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
    const onHand = (batch.received_qty || 0) - totalUsed;

    console.log(`Total Used: ${totalUsed}`);
    console.log(`On Hand: ${onHand}`);
    console.log();
  }

  // Check if there are any batches with products that don't exist
  const { data: orphanBatches } = await supabase
    .from('batches')
    .select('id, product_id, lot, received_qty')
    .is('products.id', null)
    .limit(10);

  if (orphanBatches && orphanBatches.length > 0) {
    console.log('\n⚠️  WARNING: Found batches with missing products:');
    orphanBatches.forEach(batch => {
      console.log(`  - Batch ${batch.id}: product_id=${batch.product_id}, lot=${batch.lot}`);
    });
  }
}

checkRecentBatches().catch(console.error);
