-- ============================================
-- Add client_id to invoices and batches
-- ============================================

BEGIN;

-- Add client_id column to invoices table
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.vic_clients(id) ON DELETE SET NULL;

-- Add client_id column to batches table (for stock tracking)
ALTER TABLE public.batches 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.vic_clients(id) ON DELETE SET NULL;

-- Create indexes on client_id for performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_batches_client_id ON public.batches(client_id);

COMMENT ON COLUMN public.invoices.client_id IS 
'Foreign key to vic_clients - identifies which client/owner this invoice is assigned to';

COMMENT ON COLUMN public.batches.client_id IS 
'Foreign key to vic_clients - identifies which client/owner this batch/stock is assigned to';

COMMIT;
