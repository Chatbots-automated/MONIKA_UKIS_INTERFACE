/*
  # Fix Visit Completion Inventory Deduction

  ## Problem
  The previous migration referenced a non-existent `stock_level` table.
  The system actually uses the `batches` table for inventory tracking.

  ## Solution
  Replace the function to properly deduct inventory from the batches table
  instead of the non-existent stock_level table.

  ## Changes
  - Drop the old function
  - Create new function that updates batches.received_qty instead
  - Keep all other logic the same (planned_medications, processing flag, etc.)
*/

-- Drop the old function that references non-existent table
DROP FUNCTION IF EXISTS process_visit_medications() CASCADE;

-- Function to process visit medications when status becomes "Baigtas"
-- Fixed to use batches table instead of stock_level
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
  v_batch record;
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

      -- Get product details for unit conversion
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

      -- Get batch details
      SELECT * INTO v_batch
      FROM batches
      WHERE id = (v_medication->>'batch_id')::uuid;

      -- Create usage_item record if we have a treatment
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

        RAISE NOTICE 'Created usage_item for treatment %', v_treatment_id;
      END IF;

      -- Deduct from inventory (batches table)
      -- Convert quantity to primary pack units for proper inventory tracking
      DECLARE
        v_qty_in_primary_units decimal;
        v_current_qty decimal;
      BEGIN
        -- Convert used quantity to primary pack units
        IF v_product.primary_pack_unit = 'ml' AND (v_medication->>'unit') = 'l' THEN
          v_qty_in_primary_units := (v_medication->>'qty')::decimal * 1000;
        ELSIF v_product.primary_pack_unit = 'l' AND (v_medication->>'unit') = 'ml' THEN
          v_qty_in_primary_units := (v_medication->>'qty')::decimal / 1000;
        ELSIF v_product.primary_pack_unit = 'g' AND (v_medication->>'unit') = 'kg' THEN
          v_qty_in_primary_units := (v_medication->>'qty')::decimal * 1000;
        ELSIF v_product.primary_pack_unit = 'kg' AND (v_medication->>'unit') = 'g' THEN
          v_qty_in_primary_units := (v_medication->>'qty')::decimal / 1000;
        ELSE
          v_qty_in_primary_units := (v_medication->>'qty')::decimal;
        END IF;

        -- Get current batch quantity
        SELECT received_qty INTO v_current_qty
        FROM batches
        WHERE id = (v_medication->>'batch_id')::uuid;

        -- Deduct from batch inventory
        UPDATE batches
        SET received_qty = GREATEST(0, received_qty - v_qty_in_primary_units),
            updated_at = now()
        WHERE id = (v_medication->>'batch_id')::uuid;

        RAISE NOTICE 'Deducted % % (% in primary units) from batch %. Qty was: %, now: %',
          v_medication->>'qty',
          v_medication->>'unit',
          v_qty_in_primary_units,
          v_medication->>'batch_id',
          v_current_qty,
          v_current_qty - v_qty_in_primary_units;
      END;
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

COMMENT ON FUNCTION process_visit_medications IS 'Automatically processes planned medications when visit status changes to Baigtas. Deducts from batches.received_qty.';
