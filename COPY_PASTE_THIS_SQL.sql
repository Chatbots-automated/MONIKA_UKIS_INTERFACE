-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- Run it all at once

-- Step 1: Drop existing tables
DROP TABLE IF EXISTS public.equipment_invoice_items CASCADE;
DROP TABLE IF EXISTS public.equipment_invoices CASCADE;

-- Step 2: Recreate equipment_invoices with all fields
CREATE TABLE public.equipment_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    supplier_id UUID,
    supplier_name TEXT,
    total_net NUMERIC DEFAULT 0,
    total_vat NUMERIC DEFAULT 0,
    total_gross NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'received',
    pdf_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    branch_number TEXT DEFAULT '1',
    document_type TEXT DEFAULT '865',
    document_series_number TEXT,
    document_number_only TEXT,
    supplier_unique_code TEXT,
    supplier_currency TEXT DEFAULT 'EUR',
    supplier_company_code TEXT,
    supplier_vat_code TEXT,
    supplier_address TEXT,
    document_type_flag TEXT,
    reverse_vat_indicator TEXT,
    non_vat_invoice BOOLEAN DEFAULT false,
    buyer_bank_account TEXT,
    supplier_bank_account TEXT,
    payment_due_date DATE,
    pvm_debtor_code TEXT,
    pvm_debtor_name TEXT,
    pvm_creditor_code TEXT,
    pvm_creditor_name TEXT,
    oss_system_document BOOLEAN DEFAULT false,
    contact_email TEXT,
    oss_country_code TEXT
);

-- Step 3: Recreate equipment_invoice_items with all fields
CREATE TABLE public.equipment_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.equipment_invoices(id) ON DELETE CASCADE,
    line_no INTEGER,
    product_id UUID,
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    vat_rate NUMERIC DEFAULT 21,
    batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    product_service_flag INTEGER DEFAULT 0,
    product_code TEXT,
    unit_type TEXT,
    quantity_sign INTEGER DEFAULT 0,
    vat_code TEXT,
    vat_amount NUMERIC,
    receiving_branch TEXT,
    buyer_company_code TEXT,
    buyer_vat_code TEXT,
    buyer_address TEXT,
    responsible_person_code TEXT,
    responsible_person_name TEXT,
    structural_unit_code TEXT,
    structural_unit_name TEXT,
    object_code TEXT,
    object_name TEXT,
    accounting_op1_debit TEXT,
    accounting_op1_credit TEXT,
    accounting_op1_expense_structure TEXT,
    accounting_op1_expense_structure_name TEXT,
    accounting_op1_realization_direction TEXT,
    accounting_op1_realization_direction_name TEXT,
    accounting_op2_debit TEXT,
    accounting_op2_credit TEXT,
    accounting_op2_expense_structure TEXT,
    accounting_op2_expense_structure_name TEXT,
    accounting_op2_realization_direction TEXT,
    accounting_op2_realization_direction_name TEXT,
    order_number TEXT
);

-- Step 4: Create indexes
CREATE INDEX idx_equipment_invoices_invoice_number ON public.equipment_invoices(invoice_number);
CREATE INDEX idx_equipment_invoices_invoice_date ON public.equipment_invoices(invoice_date);
CREATE INDEX idx_equipment_invoices_supplier_id ON public.equipment_invoices(supplier_id);
CREATE INDEX idx_equipment_invoices_status ON public.equipment_invoices(status);
CREATE INDEX idx_equipment_invoice_items_invoice_id ON public.equipment_invoice_items(invoice_id);
CREATE INDEX idx_equipment_invoice_items_product_id ON public.equipment_invoice_items(product_id);
CREATE INDEX idx_equipment_invoice_items_batch_id ON public.equipment_invoice_items(batch_id);

-- Step 5: Enable RLS
ALTER TABLE public.equipment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_invoice_items ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
DROP POLICY IF EXISTS "Allow all operations on equipment_invoices" ON public.equipment_invoices;
CREATE POLICY "Allow all operations on equipment_invoices" ON public.equipment_invoices USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on equipment_invoice_items" ON public.equipment_invoice_items;
CREATE POLICY "Allow all operations on equipment_invoice_items" ON public.equipment_invoice_items USING (true) WITH CHECK (true);

-- Step 7: Grant permissions
GRANT ALL ON TABLE public.equipment_invoices TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.equipment_invoice_items TO anon, authenticated, service_role;
