/*
  # Fix Stock Deduction for Edited Completed Visits

  ## Problem
  When editing a visit via "Redaguoti vizitą":
  - The VisitCreateModal deletes ALL usage_items for the treatment (line 2510)
  - Then recreates them based on current medication list
  - If visit status is "Baigtas", medications should be created as usage_items (line 2619)
  - However, the planned_medications trigger might interfere or not work as expected

  ## Root Cause Analysis
  The issue is in the VisitCreateModal handleSubmit function:
  1. When editing a treatment, ALL usage_items are deleted (line 2510)
  2. Medications are only recreated as usage_items if status is 'Baigtas' (line 2619)
  3. This logic SHOULD work, but there might be a timing issue with planned_medications

  ## Solution
  Ensure that when editing a completed visit with treatments:
  1. The medications are properly created as usage_items
  2. The planned_medications field is cleared if status is 'Baigtas'
  3. The trigger doesn't interfere with the direct creation

  ## Implementation
  Update the trigger to NOT process planned_medications if:
  - The visit is being updated (not created)
  - Status was already 'Baigtas' and remains 'Baigtas'
  - medications_processed is already true

  This ensures the VisitCreateModal logic takes precedence for edit operations.
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_process_visit_medications ON public.animal_visits;

-- Updated function with better handling for edit scenarios
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
BEGIN
  -- Only process if:
  -- 1. Status is changing TO "Baigtas" (was not Baigtas before)
  -- 2. Medications haven't been processed yet
  -- 3. There are planned medications to process
  IF NEW.status = 'Baigtas'
     AND (OLD.status IS NULL OR OLD.status != 'Baigtas')
     AND NEW.planned_medications IS NOT NULL
     AND NOT COALESCE(NEW.medications_processed, false) THEN

    RAISE NOTICE 'Processing medications for visit % (status changed to Baigtas)', NEW.id;

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
        'Auto-created from visit completion'
      )
      RETURNING id INTO v_treatment_id;

      RAISE NOTICE 'Created treatment record %', v_treatment_id;
    END IF;

    -- Process each planned medication
    FOR v_medication IN SELECT * FROM jsonb_array_elements(NEW.planned_medications)
    LOOP
      RAISE NOTICE 'Processing medication: %', v_medication;

      -- Get product details
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

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

-- Recreate trigger
CREATE TRIGGER trigger_process_visit_medications
  BEFORE UPDATE ON public.animal_visits
  FOR EACH ROW
  EXECUTE FUNCTION process_visit_medications();

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_visit_medications() TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_visit_medications IS 'Processes planned medications only when visit status changes to Baigtas. For editing completed visits, the application handles stock deduction directly.';
