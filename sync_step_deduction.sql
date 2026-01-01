/*
  # Synchronization Step Stock Deduction System

  1. New Triggers
    - Deduct medication stock when synchronization step is completed
    - Only triggers on completion (when completed changes from false to true)
    - Updates batch qty_left based on dosage from sync step
    - Validates that batch has sufficient stock before deduction

  2. Important Notes
    - Stock deduction only happens ONCE when step is marked as completed
    - If step is already completed, no deduction occurs
    - Requires both batch_id and dosage to be present
    - Prevents negative stock by checking qty_left
*/

-- Function to deduct stock when synchronization step is completed
CREATE OR REPLACE FUNCTION deduct_sync_step_medication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_record RECORD;
  v_dosage_qty DECIMAL;
BEGIN
  -- Only process when step is being marked as completed (false -> true transition)
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN

    -- Must have both batch_id and dosage
    IF NEW.batch_id IS NOT NULL AND NEW.dosage IS NOT NULL THEN

      -- Get current batch stock
      SELECT qty_left, lot INTO v_batch_record
      FROM batches
      WHERE id = NEW.batch_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % not found for sync step %', NEW.batch_id, NEW.id;
      END IF;

      v_dosage_qty := NEW.dosage::DECIMAL;

      -- Check if sufficient stock available
      IF v_batch_record.qty_left < v_dosage_qty THEN
        RAISE EXCEPTION 'Insufficient stock in batch % (%). Available: %, Required: %',
          v_batch_record.lot, NEW.batch_id, v_batch_record.qty_left, v_dosage_qty;
      END IF;

      -- Deduct stock from batch
      UPDATE batches
      SET qty_left = qty_left - v_dosage_qty,
          updated_at = NOW()
      WHERE id = NEW.batch_id;

      RAISE NOTICE 'Deducted % units from batch % (%) for sync step %',
        v_dosage_qty, v_batch_record.lot, NEW.batch_id, NEW.id;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on synchronization_steps table
DROP TRIGGER IF EXISTS trg_sync_step_stock_deduction ON synchronization_steps;
CREATE TRIGGER trg_sync_step_stock_deduction
  AFTER UPDATE OF completed ON synchronization_steps
  FOR EACH ROW
  EXECUTE FUNCTION deduct_sync_step_medication();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION deduct_sync_step_medication() TO authenticated;
