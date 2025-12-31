/*
  # Auto-set qty_left on batch creation

  1. Problem
    - When new batches are created, qty_left is NULL
    - This causes stock validation to fail
    - UI shows 0 stock even though batch has stock

  2. Solution
    - Create trigger to set qty_left = received_qty on batch INSERT
    - Set batch_number if not provided
    - Set status to 'active'

  3. Changes
    - Function: initialize_batch_fields
    - Trigger: trigger_initialize_batch_fields (BEFORE INSERT)
*/

-- Function to initialize batch fields on creation
CREATE OR REPLACE FUNCTION initialize_batch_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Set qty_left from received_qty if not already set
  IF NEW.qty_left IS NULL AND NEW.received_qty IS NOT NULL THEN
    NEW.qty_left := NEW.received_qty;
  END IF;

  -- Generate batch_number if not provided
  IF NEW.batch_number IS NULL THEN
    NEW.batch_number := COALESCE(
      NULLIF(NEW.lot, ''),
      'B-' || TO_CHAR(COALESCE(NEW.doc_date, CURRENT_DATE), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8)
    );
  END IF;

  -- Set status to active if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS trigger_initialize_batch_fields ON batches;
CREATE TRIGGER trigger_initialize_batch_fields
  BEFORE INSERT ON batches
  FOR EACH ROW
  EXECUTE FUNCTION initialize_batch_fields();

-- Fix existing batches with NULL qty_left
UPDATE batches
SET qty_left = received_qty,
    status = COALESCE(status, 'active'),
    batch_number = COALESCE(
      NULLIF(batch_number, ''),
      NULLIF(lot, ''),
      'B-' || TO_CHAR(COALESCE(doc_date, created_at, CURRENT_DATE), 'YYYYMMDD') || '-' || SUBSTRING(id::text, 1, 8)
    )
WHERE qty_left IS NULL AND received_qty IS NOT NULL;

COMMENT ON FUNCTION initialize_batch_fields IS 'Automatically initializes batch fields (qty_left, batch_number, status) when a new batch is created';
