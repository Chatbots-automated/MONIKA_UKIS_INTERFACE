-- Add secretary system export fields to veterinarija invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS supplier_unique_code TEXT,
ADD COLUMN IF NOT EXISTS supplier_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS supplier_company_code TEXT,
ADD COLUMN IF NOT EXISTS supplier_vat_code TEXT,
ADD COLUMN IF NOT EXISTS supplier_address TEXT,
ADD COLUMN IF NOT EXISTS supplier_accounting_account TEXT,
ADD COLUMN IF NOT EXISTS branch_number TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS document_series_number TEXT,
ADD COLUMN IF NOT EXISTS document_number_only TEXT,
ADD COLUMN IF NOT EXISTS document_type_flag TEXT,
ADD COLUMN IF NOT EXISTS reverse_vat_indicator TEXT,
ADD COLUMN IF NOT EXISTS non_vat_invoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS buyer_bank_account TEXT,
ADD COLUMN IF NOT EXISTS payment_due_date DATE,
ADD COLUMN IF NOT EXISTS pvm_debtor_code TEXT,
ADD COLUMN IF NOT EXISTS pvm_debtor_name TEXT,
ADD COLUMN IF NOT EXISTS pvm_creditor_code TEXT,
ADD COLUMN IF NOT EXISTS pvm_creditor_name TEXT,
ADD COLUMN IF NOT EXISTS oss_system_document BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS oss_country_code TEXT;

-- Add secretary system export fields to veterinarija invoice_items table
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS product_code TEXT,
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'vnt',
ADD COLUMN IF NOT EXISTS quantity_sign INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC,
ADD COLUMN IF NOT EXISTS vat_code TEXT,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC,
ADD COLUMN IF NOT EXISTS product_service_flag INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS responsible_person_code TEXT,
ADD COLUMN IF NOT EXISTS responsible_person_name TEXT,
ADD COLUMN IF NOT EXISTS accounting_op1_debit TEXT,
ADD COLUMN IF NOT EXISTS accounting_op1_credit TEXT,
ADD COLUMN IF NOT EXISTS accounting_op1_expense_structure TEXT,
ADD COLUMN IF NOT EXISTS accounting_operation_code INTEGER,
ADD COLUMN IF NOT EXISTS structural_unit_code TEXT,
ADD COLUMN IF NOT EXISTS structural_unit_name TEXT,
ADD COLUMN IF NOT EXISTS object_code TEXT,
ADD COLUMN IF NOT EXISTS object_name TEXT;

-- Add comments
COMMENT ON COLUMN public.invoices.supplier_unique_code IS 'L006 - Supplier unique code from secretary system';
COMMENT ON COLUMN public.invoices.branch_number IS 'L001 - Branch number for secretary system export';
COMMENT ON COLUMN public.invoices.document_series_number IS 'L003 - Document series and number';
COMMENT ON COLUMN public.invoices.reverse_vat_indicator IS 'L069 - Reverse VAT indicator';
COMMENT ON COLUMN public.invoice_items.product_service_flag IS 'L009 - Product (0) or Service (1) flag';
COMMENT ON COLUMN public.invoice_items.accounting_operation_code IS 'L086 - Accounting operation code from secretary_accounting_operations.code';

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_unique_code ON public.invoices(supplier_unique_code);
CREATE INDEX IF NOT EXISTS idx_invoice_items_accounting_op_code ON public.invoice_items(accounting_operation_code);
