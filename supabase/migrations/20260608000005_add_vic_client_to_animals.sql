-- ============================================
-- Add VIC Client relationship to Animals
-- ============================================

BEGIN;

-- Add vic_client_id column to animals table
ALTER TABLE public.animals 
  ADD COLUMN IF NOT EXISTS vic_client_id uuid REFERENCES public.vic_clients(id) ON DELETE SET NULL;

-- Add unique constraint on tag_no (needed for sync_animals function)
ALTER TABLE public.animals 
  ADD CONSTRAINT animals_tag_no_unique UNIQUE (tag_no);

-- Create index on vic_client_id for performance
CREATE INDEX IF NOT EXISTS idx_animals_vic_client_id ON public.animals(vic_client_id);

-- Add index on tag_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_animals_tag_no ON public.animals(tag_no);

COMMENT ON COLUMN public.animals.vic_client_id IS 
'Foreign key to vic_clients - identifies which owner/client this animal belongs to';

COMMIT;
