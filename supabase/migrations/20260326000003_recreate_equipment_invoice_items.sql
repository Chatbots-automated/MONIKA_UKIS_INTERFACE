-- Drop and recreate equipment_invoice_items with all secretary fields

DROP TABLE IF EXISTS public.equipment_invoice_items CASCADE;

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

CREATE INDEX idx_equipment_invoice_items_invoice_id ON public.equipment_invoice_items(invoice_id);
CREATE INDEX idx_equipment_invoice_items_product_id ON public.equipment_invoice_items(product_id);
CREATE INDEX idx_equipment_invoice_items_batch_id ON public.equipment_invoice_items(batch_id);

ALTER TABLE public.equipment_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on equipment_invoice_items" ON public.equipment_invoice_items;
CREATE POLICY "Allow all operations on equipment_invoice_items" ON public.equipment_invoice_items USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.equipment_invoice_items TO anon, authenticated, service_role;
