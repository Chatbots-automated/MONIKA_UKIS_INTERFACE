-- Add accounting_operation_code (L086) to equipment_invoice_items
ALTER TABLE public.equipment_invoice_items 
ADD COLUMN IF NOT EXISTS accounting_operation_code INTEGER;

-- Add comment
COMMENT ON COLUMN public.equipment_invoice_items.accounting_operation_code IS 'L086 - Accounting operation code from secretary_accounting_operations.code';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_invoice_items_accounting_op_code 
ON public.equipment_invoice_items(accounting_operation_code);
