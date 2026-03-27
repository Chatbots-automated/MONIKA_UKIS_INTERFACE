-- Drop and recreate equipment_invoices with all secretary fields

DROP TABLE IF EXISTS public.equipment_invoices CASCADE;

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

CREATE INDEX idx_equipment_invoices_invoice_number ON public.equipment_invoices(invoice_number);
CREATE INDEX idx_equipment_invoices_invoice_date ON public.equipment_invoices(invoice_date);
CREATE INDEX idx_equipment_invoices_supplier_id ON public.equipment_invoices(supplier_id);
CREATE INDEX idx_equipment_invoices_status ON public.equipment_invoices(status);

ALTER TABLE public.equipment_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on equipment_invoices" ON public.equipment_invoices;
CREATE POLICY "Allow all operations on equipment_invoices" ON public.equipment_invoices USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.equipment_invoices TO anon, authenticated, service_role;
