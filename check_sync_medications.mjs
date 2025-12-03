import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSyncMeds() {
  console.log('Looking for cow LT000008564183...\n');
  
  // Find the animal
  const { data: animal } = await supabase
    .from('animals')
    .select('id, tag_no')
    .eq('tag_no', 'LT000008564183')
    .single();
  
  if (!animal) {
    console.log('Animal not found');
    return;
  }
  
  console.log('Found animal:', animal);
  console.log('\nLooking for visits...\n');
  
  // Find visits
  const { data: visits } = await supabase
    .from('animal_visits')
    .select('*')
    .eq('animal_id', animal.id)
    .order('visit_datetime', { ascending: false });
  
  console.log(`Found ${visits?.length || 0} visits`);
  
  if (visits && visits.length > 0) {
    console.log('\nCompleted visits:');
    const completed = visits.filter(v => v.status === 'Baigtas');
    console.log(`${completed.length} completed visits`);
    
    for (const visit of completed) {
      console.log(`\n  Visit ${visit.visit_datetime}:`);
      console.log(`    Status: ${visit.status}`);
      console.log(`    Procedures: ${visit.procedures?.join(', ')}`);
      console.log(`    Notes: ${visit.notes?.substring(0, 100)}...`);
      console.log(`    Related treatment ID: ${visit.related_treatment_id}`);
      console.log(`    Sync step ID: ${visit.sync_step_id}`);
      
      // Check if there's a treatment
      if (visit.related_treatment_id) {
        const { data: treatment } = await supabase
          .from('treatments')
          .select('id, clinical_diagnosis')
          .eq('id', visit.related_treatment_id)
          .single();
        
        if (treatment) {
          console.log(`    Treatment: ${treatment.clinical_diagnosis}`);
          
          // Check medications
          const { data: meds } = await supabase
            .from('usage_items')
            .select(`
              *,
              product:products(name),
              batch:batches(purchase_price, received_qty)
            `)
            .eq('treatment_id', treatment.id);
          
          if (meds && meds.length > 0) {
            console.log(`    Medications (${meds.length}):`);
            for (const med of meds) {
              const cost = med.batch 
                ? (med.qty * med.batch.purchase_price / med.batch.received_qty).toFixed(2)
                : 'N/A';
              console.log(`      - ${med.product?.name}: ${med.qty} ${med.unit} = €${cost}`);
            }
          } else {
            console.log('    No medications found');
          }
        }
      } else {
        console.log('    No related treatment');
      }
    }
  }
  
  console.log('\n\nChecking treatments directly...\n');
  
  const { data: treatments } = await supabase
    .from('treatments')
    .select(`
      *,
      visit:animal_visits(status, visit_datetime)
    `)
    .eq('animal_id', animal.id)
    .gte('reg_date', '2025-11-01');
  
  console.log(`Found ${treatments?.length || 0} treatments since Nov 1`);
  
  if (treatments && treatments.length > 0) {
    for (const treatment of treatments) {
      console.log(`\n  Treatment ${treatment.reg_date}:`);
      console.log(`    Diagnosis: ${treatment.clinical_diagnosis}`);
      console.log(`    Visit status: ${treatment.visit?.status || 'No visit'}`);
      
      const { data: meds } = await supabase
        .from('usage_items')
        .select(`
          *,
          product:products(name),
          batch:batches(purchase_price, received_qty)
        `)
        .eq('treatment_id', treatment.id);
      
      if (meds && meds.length > 0) {
        console.log(`    Medications (${meds.length}):`);
        let totalCost = 0;
        for (const med of meds) {
          const cost = med.batch 
            ? (med.qty * med.batch.purchase_price / med.batch.received_qty)
            : 0;
          totalCost += cost;
          console.log(`      - ${med.product?.name}: ${med.qty} ${med.unit} = €${cost.toFixed(2)}`);
        }
        console.log(`    Total medication cost: €${totalCost.toFixed(2)}`);
      }
    }
  }
}

checkSyncMeds();
