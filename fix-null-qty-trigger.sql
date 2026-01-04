/*
  # Fix Null Qty Error in Visit Medications Trigger

  ## Problem
  When editing a visit and adding medicines, if the qty is null in planned_medications,
  the trigger tries to insert null into usage_items.qty which has a NOT NULL constraint.

  ## Solution
  Only process medications that have valid (non-null) qty values in the trigger.
*/

-- Updated function to skip medications without qty
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
  v_qty decimal;
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

      -- Extract and validate qty
      BEGIN
        v_qty := (v_medication->>'qty')::decimal;
      EXCEPTION WHEN OTHERS THEN
        v_qty := NULL;
      END;

      -- CRITICAL FIX: Skip medications without valid qty
      IF v_qty IS NULL OR v_qty <= 0 THEN
        RAISE WARNING 'Skipping medication without valid qty: %', v_medication;
        CONTINUE;
      END IF;

      -- Get product details for unit conversion if needed
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

      -- Create usage_item record if we have a treatment
      -- The stock_by_batch view will automatically calculate remaining stock
      IF v_treatment_id IS NOT NULL AND (v_medication->>'batch_id') IS NOT NULL THEN
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
          v_qty,
          COALESCE(v_medication->>'unit', 'ml')::unit,
          COALESCE(v_medication->>'purpose', 'Gydymas'),
          v_medication->>'teat'
        );

        RAISE NOTICE 'Created usage_item for treatment %. Product: %, Batch: %, Qty: % %',
          v_treatment_id,
          v_medication->>'product_id',
          v_medication->>'batch_id',
          v_qty,
          COALESCE(v_medication->>'unit', 'ml');
      ELSE
        RAISE WARNING 'Skipping medication - missing treatment_id or batch_id: %', v_medication;
      END IF;
    END LOOP;

    -- Mark medications as processed
    NEW.medications_processed := true;

    RAISE NOTICE 'Completed processing medications for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, function is replaced above
COMMENT ON FUNCTION process_visit_medications IS 'Automatically creates usage_items when visit status changes to Baigtas. Only processes medications with valid qty and batch_id values.';
