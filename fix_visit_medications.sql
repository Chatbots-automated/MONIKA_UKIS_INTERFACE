/*
  # Fix Visit Completion Inventory Deduction

  ## Problem
  The previous migration incorrectly tried to:
  1. Reference a non-existent `stock_level` table
  2. Directly update `batches.received_qty`

  The system actually uses `usage_items` to track consumption and a VIEW
  (`stock_by_batch`) that calculates: on_hand = received_qty - SUM(usage_items.qty)

  ## Solution
  Only create `usage_items` records when visits are completed.
  The stock views will automatically reflect the correct inventory.

  ## Changes
  - Drop the old function
  - Create new function that ONLY creates usage_items (no direct batch updates)
  - System calculates stock automatically via stock_by_batch view
*/

-- Drop the old function
DROP FUNCTION IF EXISTS process_visit_medications() CASCADE;

-- Function to process visit medications when status becomes "Baigtas"
-- Fixed to only create usage_items (inventory is calculated via views)
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
BEGIN
  -- Only process if status is changing TO "Baigtas" and medications haven't been processed yet
  IF NEW.status = 'Baigtas'
     AND (OLD.status IS NULL OR OLD.status != 'Baigtas')
     AND NEW.planned_medications IS NOT NULL
     AND NOT COALESCE(NEW.medications_processed, false) THEN

    RAISE NOTICE 'Processing medications for visit %', NEW.id;

    -- Get the treatment_id for this visit (if exists)
    SELECT id INTO v_treatment_id
    FROM treatments
    WHERE visit_id = NEW.id
    LIMIT 1;

    -- If no treatment exists yet and this visit requires treatment, create one
    IF v_treatment_id IS NULL AND NEW.treatment_required THEN
      INSERT INTO treatments (
        animal_id,
        visit_id,
        reg_date,
        vet_name,
        notes
      ) VALUES (
        NEW.animal_id,
        NEW.id,
        DATE(NEW.visit_datetime),
        NEW.vet_name,
        'Auto-created from course visit completion'
      )
      RETURNING id INTO v_treatment_id;

      RAISE NOTICE 'Created treatment record %', v_treatment_id;
    END IF;

    -- Process each planned medication
    FOR v_medication IN SELECT * FROM jsonb_array_elements(NEW.planned_medications)
    LOOP
      RAISE NOTICE 'Processing medication: %', v_medication;

      -- Get product details for unit conversion if needed
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

      -- Create usage_item record if we have a treatment
      -- The stock_by_batch view will automatically calculate remaining stock
      IF v_treatment_id IS NOT NULL THEN
        INSERT INTO usage_items (
          treatment_id,
          product_id,
          batch_id,
          qty,
          unit,
          purpose,
          teat
        ) VALUES (
          v_treatment_id,
          (v_medication->>'product_id')::uuid,
          (v_medication->>'batch_id')::uuid,
          (v_medication->>'qty')::decimal,
          COALESCE(v_medication->>'unit', 'ml')::unit,
          COALESCE(v_medication->>'purpose', 'Gydymas'),
          v_medication->>'teat'
        );

        RAISE NOTICE 'Created usage_item for treatment %. Product: %, Batch: %, Qty: % %',
          v_treatment_id,
          v_medication->>'product_id',
          v_medication->>'batch_id',
          v_medication->>'qty',
          COALESCE(v_medication->>'unit', 'ml');
      END IF;
    END LOOP;

    -- Mark medications as processed
    NEW.medications_processed := true;

    RAISE NOTICE 'Completed processing medications for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically process medications when visit is completed
DROP TRIGGER IF EXISTS trigger_process_visit_medications ON public.animal_visits;
CREATE TRIGGER trigger_process_visit_medications
  BEFORE UPDATE ON public.animal_visits
  FOR EACH ROW
  EXECUTE FUNCTION process_visit_medications();

COMMENT ON FUNCTION process_visit_medications IS 'Automatically creates usage_items when visit status changes to Baigtas. Inventory is calculated automatically via stock_by_batch view.';
