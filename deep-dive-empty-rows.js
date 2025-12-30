import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function deepDive() {
  console.log('🔬 Deep dive into "empty" treatments...\n');

  // Get treatments from Dec 27 that show as empty
  const { data: viewData } = await supabase
    .from('vw_treated_animals')
    .select('*')
    .eq('registration_date', '2025-12-27')
    .is('products_used', null);

  console.log(`Found ${viewData?.length || 0} treatments showing as empty\n`);

  for (const row of viewData || []) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Treatment: ${row.animal_tag}`);
    console.log(`Date: ${row.registration_date}`);
    console.log(`View shows:`);
    console.log(`  - products_used: ${row.products_used || 'NULL'}`);
    console.log(`  - dose_summary: ${row.dose_summary || 'NULL'}`);
    console.log(`  - veterinarian: ${row.veterinarian || 'NULL'}`);
    console.log(`  - treatment_days: ${row.treatment_days || 'NULL'}`);

    // Check actual treatment record
    const { data: treatment } = await supabase
      .from('treatments')
      .select('*')
      .eq('id', row.treatment_id)
      .single();

    console.log(`\nActual treatment record:`);
    console.log(`  - vet_name: ${treatment?.vet_name || 'NULL'}`);
    console.log(`  - reg_date: ${treatment?.reg_date}`);
    console.log(`  - disease_id: ${treatment?.disease_id || 'NULL'}`);

    // Check if there are visit medications for this animal around this date
    const { data: visitMeds } = await supabase
      .from('visit_medications')
      .select('*, visits(visit_date, animal_id)')
      .eq('visits.animal_id', row.animal_id)
      .gte('visits.visit_date', '2025-12-20')
      .lte('visits.visit_date', '2025-12-31');

    console.log(`\nVisit medications around this date: ${visitMeds?.length || 0}`);
    if (visitMeds && visitMeds.length > 0) {
      visitMeds.forEach(vm => {
        console.log(`  - Date: ${vm.visits?.visit_date}, Product: ${vm.product_id?.substring(0, 8)}, Qty: ${vm.quantity}`);
      });
    }

    // Check usage_items
    const { data: usageItems } = await supabase
      .from('usage_items')
      .select('*, products(name)')
      .eq('treatment_id', row.treatment_id);

    console.log(`\nUsage items: ${usageItems?.length || 0}`);
    if (usageItems && usageItems.length > 0) {
      usageItems.forEach(ui => {
        console.log(`  - ${ui.products?.name}: ${ui.qty} ${ui.unit}`);
      });
    }

    // Check if there's a visit linked to this treatment
    const { data: visits } = await supabase
      .from('visits')
      .select('*, visit_medications(*, products(name))')
      .eq('animal_id', row.animal_id)
      .eq('visit_date', row.registration_date);

    console.log(`\nVisits on this date: ${visits?.length || 0}`);
    if (visits && visits.length > 0) {
      visits.forEach(v => {
        console.log(`  - Visit ID: ${v.id.substring(0, 8)}`);
        console.log(`  - Medications: ${v.visit_medications?.length || 0}`);
        v.visit_medications?.forEach(vm => {
          console.log(`    * ${vm.products?.name}: ${vm.quantity} ${vm.unit}`);
        });
      });
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 DIAGNOSIS:');
  console.log('If visit_medications exist but usage_items is empty,');
  console.log('then medications are in visits but not linked to treatments!\n');
}

deepDive().catch(console.error);
