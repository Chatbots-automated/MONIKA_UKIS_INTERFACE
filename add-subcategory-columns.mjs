import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addSubcategoryColumns() {
  try {
    console.log('Checking products table schema...\n');

    // Check current schema
    const { data: products, error: selectError } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('Error querying products:', selectError);
      return;
    }

    if (products && products.length > 0) {
      const columns = Object.keys(products[0]);
      console.log('Current columns:', columns.join(', '));

      const hasSubcategory = columns.includes('subcategory');
      const hasSubcategory2 = columns.includes('subcategory_2');

      console.log('\nColumn status:');
      console.log('  subcategory:', hasSubcategory ? '✓ EXISTS' : '✗ MISSING');
      console.log('  subcategory_2:', hasSubcategory2 ? '✓ EXISTS' : '✗ MISSING');

      if (hasSubcategory && hasSubcategory2) {
        console.log('\n✓ All required columns exist!');
        return;
      }

      console.log('\n⚠️  Columns need to be added manually via Supabase Dashboard:');
      console.log('\n1. Go to Supabase Dashboard > Table Editor > products');
      console.log('2. Click "New Column" and add:');
      if (!hasSubcategory) {
        console.log('   - Name: subcategory');
        console.log('   - Type: text');
        console.log('   - Nullable: true');
      }
      if (!hasSubcategory2) {
        console.log('   - Name: subcategory_2');
        console.log('   - Type: text');
        console.log('   - Nullable: true');
      }

      console.log('\nOr run this SQL in the SQL Editor:');
      console.log('');
      console.log('ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;');
      console.log('ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_2 text;');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addSubcategoryColumns();
