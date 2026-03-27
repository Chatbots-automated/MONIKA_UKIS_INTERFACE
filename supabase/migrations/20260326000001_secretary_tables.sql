-- Secretary System Integration - Part 1: Create Tables

CREATE TABLE IF NOT EXISTS public.secretary_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bar_code TEXT,
    product_code TEXT,
    unit_type TEXT,
    price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    product_code_2 TEXT,
    group_code INTEGER,
    group_name TEXT,
    vat_sale NUMERIC DEFAULT 21,
    vat_purchase NUMERIC DEFAULT 21,
    markup NUMERIC DEFAULT 0,
    alcohol INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secretary_materials_code ON public.secretary_materials(code);
CREATE INDEX IF NOT EXISTS idx_secretary_materials_name ON public.secretary_materials(name);

CREATE TABLE IF NOT EXISTS public.secretary_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    additional_info TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secretary_services_code ON public.secretary_services(code);

CREATE TABLE IF NOT EXISTS public.secretary_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    company_code TEXT,
    vat_code TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    bank_code INTEGER,
    bank_account TEXT,
    vmi INTEGER,
    additional_info TEXT,
    account_group TEXT,
    account_type TEXT,
    account_name TEXT,
    accounting_account INTEGER,
    currency TEXT DEFAULT 'Eur',
    recipient_company_code TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secretary_suppliers_code ON public.secretary_suppliers(code);
CREATE INDEX IF NOT EXISTS idx_secretary_suppliers_name ON public.secretary_suppliers(name);

CREATE TABLE IF NOT EXISTS public.secretary_responsible_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    additional_info TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secretary_responsible_persons_code ON public.secretary_responsible_persons(code);

CREATE TABLE IF NOT EXISTS public.secretary_accounting_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    debit TEXT,
    credit TEXT,
    expense_structure TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secretary_accounting_operations_code ON public.secretary_accounting_operations(code);

CREATE TABLE IF NOT EXISTS public.secretary_export_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.secretary_export_config (key, value, description) VALUES
    ('default_branch', '1', 'Default branch number (L001)'),
    ('document_type', '865', 'Purchase document type (L002) - fixed'),
    ('default_currency', 'EUR', 'Default currency for transactions'),
    ('default_accounting_credit', '451', 'Default 1st accounting operation credit (L029)')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.secretary_invoice_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.equipment_invoices(id) ON DELETE CASCADE,
    export_payload JSONB NOT NULL,
    export_status TEXT DEFAULT 'pending',
    exported_at TIMESTAMPTZ DEFAULT NOW(),
    exported_by UUID REFERENCES auth.users(id),
    error_message TEXT,
    confirmation_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secretary_invoice_exports_invoice_id ON public.secretary_invoice_exports(invoice_id);

ALTER TABLE public.secretary_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_responsible_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_accounting_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_export_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_invoice_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on secretary_materials" ON public.secretary_materials;
DROP POLICY IF EXISTS "Allow all operations on secretary_services" ON public.secretary_services;
DROP POLICY IF EXISTS "Allow all operations on secretary_suppliers" ON public.secretary_suppliers;
DROP POLICY IF EXISTS "Allow all operations on secretary_responsible_persons" ON public.secretary_responsible_persons;
DROP POLICY IF EXISTS "Allow all operations on secretary_accounting_operations" ON public.secretary_accounting_operations;
DROP POLICY IF EXISTS "Allow all operations on secretary_export_config" ON public.secretary_export_config;
DROP POLICY IF EXISTS "Allow all operations on secretary_invoice_exports" ON public.secretary_invoice_exports;

CREATE POLICY "Allow all operations on secretary_materials" ON public.secretary_materials USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on secretary_services" ON public.secretary_services USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on secretary_suppliers" ON public.secretary_suppliers USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on secretary_responsible_persons" ON public.secretary_responsible_persons USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on secretary_accounting_operations" ON public.secretary_accounting_operations USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on secretary_export_config" ON public.secretary_export_config USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on secretary_invoice_exports" ON public.secretary_invoice_exports USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.secretary_materials TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretary_services TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretary_suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretary_responsible_persons TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretary_accounting_operations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretary_export_config TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretary_invoice_exports TO anon, authenticated, service_role;
