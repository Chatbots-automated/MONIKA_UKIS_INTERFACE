import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testInventoryValue() {
  console.log('='.repeat(60));
  console.log('TESTING INVENTORY VALUE CALCULATION');
  console.log('='.repeat(60));
  console.log();

  // Get batches data
  const { data: batches } = await supabase
    .from('batches')
    .select('id, product_id, received_qty, purchase_price');

  // Get all usage data
  const { data: usage } = await supabase
    .from('usage_items')
    .select('batch_id, qty');

  // Get products for category breakdown
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category');

  console.log(`Total batches: ${batches?.length || 0}`);
  console.log(`Total usage items: ${usage?.length || 0}`);
  console.log();

  // Calculate usage by batch
  const usageByBatch = new Map();
  usage?.forEach(u => {
    if (u.batch_id) {
      const current = usageByBatch.get(u.batch_id) || 0;
      usageByBatch.set(u.batch_id, current + (parseFloat(u.qty) || 0));
    }
  });

  // Calculate total value
  let totalValue = 0;
  const categoryValue = new Map();
  let detailedBreakdown = [];

  batches?.forEach(b => {
    const totalUsed = usageByBatch.get(b.id) || 0;
    const receivedQty = parseFloat(b.received_qty) || 0;
    const onHand = receivedQty - totalUsed;

    if (onHand > 0) {
      const purchasePrice = parseFloat(b.purchase_price) || 0;
      const unitPrice = receivedQty > 0 ? purchasePrice / receivedQty : 0;
      const batchValue = unitPrice * onHand;

      totalValue += batchValue;

      // Track by category
      const product = products?.find(p => p.id === b.product_id);
      if (product) {
        const current = categoryValue.get(product.category) || 0;
        categoryValue.set(product.category, current + batchValue);

        if (batchValue > 100) {
          detailedBreakdown.push({
            product: product.name,
            category: product.category,
            onHand: onHand.toFixed(2),
            unitPrice: unitPrice.toFixed(2),
            value: batchValue.toFixed(2)
          });
        }
      }
    }
  });

  console.log('TOTAL INVENTORY VALUE:', `€${totalValue.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log();
  console.log('VALUE BY CATEGORY:');
  console.log('-'.repeat(60));

  const sortedCategories = Array.from(categoryValue.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([category, value]) => {
    console.log(`${category.padEnd(20)} €${value.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  });

  console.log();
  console.log('TOP 10 MOST VALUABLE PRODUCTS IN STOCK:');
  console.log('-'.repeat(60));

  detailedBreakdown
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
    .slice(0, 10)
    .forEach((item, idx) => {
      console.log(`${(idx + 1)}.`.padEnd(4) + item.product.substring(0, 35).padEnd(37) + `€${parseFloat(item.value).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}`);
    });
}

testInventoryValue().catch(console.error);
