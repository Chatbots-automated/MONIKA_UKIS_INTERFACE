// Supabase Edge Function for Secretary System Data Sync
// Receives data from n8n and updates lookup tables

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sync_type, data } = await req.json();

    console.log('Received sync request:', {
      sync_type,
      materials_count: data.materials?.length || 0,
      services_count: data.services?.length || 0,
      suppliers_count: data.suppliers?.length || 0,
      responsible_persons_count: data.responsible_persons?.length || 0,
      accounting_operations_count: data.accounting_operations?.length || 0,
    });

    const results: any = {
      success: true,
      synced_at: new Date().toISOString(),
      counts: {},
      errors: [],
    };

    // Sync Materials
    if (data.materials && data.materials.length > 0) {
      const { error: materialsError } = await supabaseClient
        .from('secretary_materials')
        .upsert(
          data.materials.map((m: any) => ({
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
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'code' }
        );

      if (materialsError) {
        results.errors.push({ table: 'materials', error: materialsError.message });
      } else {
        results.counts.materials = data.materials.length;
      }
    }

    // Sync Services
    if (data.services && data.services.length > 0) {
      const { error: servicesError } = await supabaseClient
        .from('secretary_services')
        .upsert(
          data.services.map((s: any) => ({
            code: s.code,
            name: s.name,
            additional_info: s.additional_info,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'code' }
        );

      if (servicesError) {
        results.errors.push({ table: 'services', error: servicesError.message });
      } else {
        results.counts.services = data.services.length;
      }
    }

    // Sync Suppliers
    if (data.suppliers && data.suppliers.length > 0) {
      const { error: suppliersError } = await supabaseClient
        .from('secretary_suppliers')
        .upsert(
          data.suppliers.map((s: any) => ({
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
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'code' }
        );

      if (suppliersError) {
        results.errors.push({ table: 'suppliers', error: suppliersError.message });
      } else {
        results.counts.suppliers = data.suppliers.length;
      }
    }

    // Sync Responsible Persons
    if (data.responsible_persons && data.responsible_persons.length > 0) {
      const { error: personsError } = await supabaseClient
        .from('secretary_responsible_persons')
        .upsert(
          data.responsible_persons.map((p: any) => ({
            code: p.code,
            name: p.name,
            additional_info: p.additional_info,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'code' }
        );

      if (personsError) {
        results.errors.push({ table: 'responsible_persons', error: personsError.message });
      } else {
        results.counts.responsible_persons = data.responsible_persons.length;
      }
    }

    // Sync Accounting Operations
    if (data.accounting_operations && data.accounting_operations.length > 0) {
      const { error: operationsError } = await supabaseClient
        .from('secretary_accounting_operations')
        .upsert(
          data.accounting_operations.map((o: any) => ({
            code: o.code,
            name: o.name,
            debit: o.debit,
            credit: o.credit,
            expense_structure: o.expense_structure,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'code' }
        );

      if (operationsError) {
        results.errors.push({ table: 'accounting_operations', error: operationsError.message });
      } else {
        results.counts.accounting_operations = data.accounting_operations.length;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in secretary sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
