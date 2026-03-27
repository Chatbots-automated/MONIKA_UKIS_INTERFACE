// Import secretary system reference data into Supabase
// Run this script to populate the lookup tables with data from secretary_data.json

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importInBatches(table: string, data: any[], batchSize: number = 500) {
  const total = data.length;
  let imported = 0;
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'code' });
    
    if (error) {
      console.error(`Error importing batch ${i}-${i + batch.length}:`, error);
      throw error;
    }
    
    imported += batch.length;
    process.stdout.write(`\r  Progress: ${imported}/${total} (${Math.round(imported/total*100)}%)`);
  }
  console.log('');
}

async function importSecretaryData() {
  console.log('Starting secretary data import...\n');
  
  const dataPath = path.join(process.cwd(), 'secretary_data.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);
  
  try {
    console.log(`Importing ${data.materials.length} materials...`);
    await importInBatches('secretary_materials', data.materials.map((m: any) => ({
      code: m.code,
      name: m.name,
      bar_code: m.bar_code,
      product_code: m.product_code,
      unit_type: m.unit_type,
      price: m.price,
      selling_price: m.selling_price,
      product_code_2: m.product_code_2,
      group_code: m.group_code,
      group_name: m.group_name,
      vat_sale: m.vat_sale,
      vat_purchase: m.vat_purchase,
      markup: m.markup,
      alcohol: m.alcohol,
      last_synced_at: new Date().toISOString(),
    })));
    console.log('✓ Materials imported\n');
    
    console.log(`Importing ${data.services.length} services...`);
    await importInBatches('secretary_services', data.services.map((s: any) => ({
      code: s.code,
      name: s.name,
      additional_info: s.additional_info,
      last_synced_at: new Date().toISOString(),
    })));
    console.log('✓ Services imported\n');
    
    console.log(`Importing ${data.suppliers.length} suppliers...`);
    await importInBatches('secretary_suppliers', data.suppliers.map((s: any) => ({
      code: s.code,
      name: s.name,
      company_code: s.company_code,
      vat_code: s.vat_code,
      address: s.address,
      email: s.email,
      phone: s.phone,
      bank_code: s.bank_code,
      bank_account: s.bank_account,
      vmi: s.vmi,
      additional_info: s.additional_info,
      account_group: s.account_group,
      account_type: s.account_type,
      account_name: s.account_name,
      accounting_account: s.accounting_account,
      currency: s.currency,
      recipient_company_code: s.recipient_company_code,
      last_synced_at: new Date().toISOString(),
    })));
    console.log('✓ Suppliers imported\n');
    
    console.log(`Importing ${data.responsible_persons.length} responsible persons...`);
    await importInBatches('secretary_responsible_persons', data.responsible_persons.map((p: any) => ({
      code: p.code,
      name: p.name,
      additional_info: p.additional_info,
      last_synced_at: new Date().toISOString(),
    })));
    console.log('✓ Responsible persons imported\n');
    
    console.log(`Importing ${data.accounting_operations.length} accounting operations...`);
    await importInBatches('secretary_accounting_operations', data.accounting_operations.map((o: any) => ({
      code: o.code,
      name: o.name,
      debit: o.debit,
      credit: o.credit,
      expense_structure: o.expense_structure,
      last_synced_at: new Date().toISOString(),
    })));
    console.log('✓ Accounting operations imported\n');
    
    console.log('✓ All data imported successfully!');
    
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

importSecretaryData();
