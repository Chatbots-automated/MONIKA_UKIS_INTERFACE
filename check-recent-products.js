import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRecentProducts() {
  console.log('Checking recently created products...\n');

  // Get the 10 most recent products
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} recent products:\n`);

  for (const product of products) {
    console.log('='.repeat(60));
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Category: ${product.category}`);
    console.log(`Unit: ${product.primary_pack_unit}`);
    console.log(`Pack Size: ${product.primary_pack_size || 'N/A'}`);
    console.log(`Created: ${product.created_at}`);

    // Check if this product has any batches
    const { data: batches } = await supabase
      .from('batches')
      .select('id, lot, received_qty, package_size, package_count')
      .eq('product_id', product.id);

    console.log(`Batches: ${batches?.length || 0}`);
    if (batches && batches.length > 0) {
      batches.forEach(batch => {
        console.log(`  - Lot: ${batch.lot || 'N/A'}, Qty: ${batch.received_qty}, Pkg: ${batch.package_size}x${batch.package_count}`);
      });
    }
    console.log();
  }
}

checkRecentProducts().catch(console.error);
