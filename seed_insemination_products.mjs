import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const gloves = [
  'Ginekologinės pirštinės vokiškos, vnt',
  'Movos vokiškos, vnt',
  'Pirštinės uždengiančios petį, N50, vnt',
  'Movos prancūziškos Alpha sheet, vnt'
];

const sperm = [
  'Barnaby AA, triple (mėsinis), vnt',
  'Capitol SEX,vnt',
  'Donvil b.sp',
  'Guevara b.sp., (mėsinis),vnt',
  'Lascaro b.sp',
  'Lascaro SEXVYR b.sp',
  'Lukas Triple (mėsinis)',
  'Moloko SEX b.sp, vnt',
  'Renew ET SEX, vnt',
  'Setlur SEX b.sp, vnt',
  'TiqTaq SEX, vnt',
  'Unisson b.sp., (mėsinis),vnt'
];

async function seedProducts() {
  console.log('Checking existing products...');
  
  const { data: existing } = await supabase
    .from('insemination_products')
    .select('name');
  
  const existingNames = new Set(existing?.map(p => p.name) || []);
  
  console.log(`Found ${existingNames.size} existing products\n`);
  
  // Insert gloves
  console.log('Inserting GLOVES products...');
  for (const name of gloves) {
    if (!existingNames.has(name)) {
      const { error } = await supabase
        .from('insemination_products')
        .insert({
          name,
          product_type: 'GLOVES',
          supplier_group: 'PASARU GRUPE',
          unit: 'vnt',
          is_active: true
        });
      
      if (error) {
        console.error(`Error inserting ${name}:`, error.message);
      } else {
        console.log(`✓ Added: ${name}`);
      }
    } else {
      console.log(`- Exists: ${name}`);
    }
  }
  
  // Insert sperm
  console.log('\nInserting SPERM products...');
  for (const name of sperm) {
    if (!existingNames.has(name)) {
      const { error } = await supabase
        .from('insemination_products')
        .insert({
          name,
          product_type: 'SPERM',
          supplier_group: 'PASARU GRUPE',
          unit: 'vnt',
          is_active: true
        });
      
      if (error) {
        console.error(`Error inserting ${name}:`, error.message);
      } else {
        console.log(`✓ Added: ${name}`);
      }
    } else {
      console.log(`- Exists: ${name}`);
    }
  }
  
  // Summary
  const { data: allProducts, error } = await supabase
    .from('insemination_products')
    .select('*')
    .order('product_type', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) {
    console.error('\nError fetching products:', error);
  } else {
    console.log(`\n✓ Total products in database: ${allProducts.length}`);
    console.log(`  - GLOVES: ${allProducts.filter(p => p.product_type === 'GLOVES').length}`);
    console.log(`  - SPERM: ${allProducts.filter(p => p.product_type === 'SPERM').length}`);
  }
}

seedProducts();
