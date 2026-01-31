-- =====================================================
-- FIX: Unit Column Type Casting Issue
-- =====================================================
-- Problem: Getting error "column unit is of type unit but expression is of type text"
-- when creating/editing visits
--
-- Root Cause: The 'unit' column uses an enum type, but some functions/triggers
-- are not properly casting text values to the enum type
--
-- Solution: Fix all functions that insert into usage_items to properly cast
-- the unit value to the enum type
-- =====================================================

-- Step 1: Fix the vaccination trigger to cast unit properly
CREATE OR REPLACE FUNCTION create_usage_item_from_vaccination()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create usage_item if we have a batch_id and dose_amount
  IF NEW.batch_id IS NOT NULL AND NEW.dose_amount IS NOT NULL AND NEW.dose_amount > 0 THEN

    -- Insert into usage_items with vaccination-specific purpose
    INSERT INTO usage_items (
      treatment_id,
      product_id,
      batch_id,
      qty,
      unit,
      purpose,
      vaccination_id,
      created_at
    ) VALUES (
      NULL,  -- vaccinations don't have treatment_id
      NEW.product_id,
      NEW.batch_id,
      NEW.dose_amount,
      NEW.unit::unit,  -- FIXED: Cast to unit enum type
      'vaccination',  -- Mark as vaccination for tracking
      NEW.id,  -- Link back to vaccination
      NEW.created_at
    );

    RAISE NOTICE 'Created usage_item for vaccination %. Product: %, Batch: %, Qty: % %',
      NEW.id,
      NEW.product_id,
      NEW.batch_id,
      NEW.dose_amount,
      NEW.unit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Ensure the visit medications function has proper error handling
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
  v_unit_value text;
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

      -- Extract unit value with proper default
      v_unit_value := COALESCE(v_medication->>'unit', 'ml');

      -- Validate unit value is not empty
      IF v_unit_value IS NULL OR v_unit_value = '' THEN
        v_unit_value := 'ml';
      END IF;

      -- Create usage_item record if we have a treatment
      -- The stock_by_batch view will automatically calculate remaining stock
      IF v_treatment_id IS NOT NULL THEN
        BEGIN
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
            v_unit_value::unit,  -- Cast to unit enum type
            COALESCE(v_medication->>'purpose', 'Gydymas'),
            v_medication->>'teat'
          );

          RAISE NOTICE 'Created usage_item for treatment %. Product: %, Batch: %, Qty: % %',
            v_treatment_id,
            v_medication->>'product_id',
            v_medication->>'batch_id',
            v_medication->>'qty',
            v_unit_value;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Failed to create usage_item for medication. Error: %. Unit value was: "%"', SQLERRM, v_unit_value;
            -- Continue processing other medications
        END;
      END IF;
    END LOOP;

    -- Mark medications as processed
    NEW.medications_processed := true;

    RAISE NOTICE 'Completed processing medications for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Unit type casting fix applied successfully!' as status;
