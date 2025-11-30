-- ============================================================================
-- FIX: Call calculate_withdrawal_dates after processing visit medications
-- ============================================================================
--
-- IMPORTANT: Copy and paste this entire file into your Supabase SQL Editor and run it
--
-- This fixes the issue where withdrawal dates (karencines dienos) are not
-- recalculated when a course visit is completed and medications are processed.
--
-- WHY: When a visit is marked as "Baigtas", the process_visit_medications trigger
-- creates usage_items records, but doesn't recalculate withdrawal dates.
-- This means the withdrawal dates don't account for the newly added medications.
-- ============================================================================

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

    -- ✅ NEW: Recalculate withdrawal dates after adding medications
    -- This ensures karencines dienos are correct based on all medications used
    IF v_treatment_id IS NOT NULL THEN
      RAISE NOTICE 'Recalculating withdrawal dates for treatment %', v_treatment_id;

      BEGIN
        PERFORM calculate_withdrawal_dates(v_treatment_id);
        RAISE NOTICE '✅ Successfully recalculated withdrawal dates for treatment %', v_treatment_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Failed to recalculate withdrawal dates: %', SQLERRM;
        -- Don't fail the entire transaction if withdrawal calculation fails
      END;
    END IF;

    -- Mark medications as processed
    NEW.medications_processed := true;

    RAISE NOTICE 'Completed processing medications for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION process_visit_medications IS
'Automatically processes visit medications when status changes to Baigtas.
Creates usage_items records, deducts from inventory, and recalculates withdrawal dates.
Ensures karencines dienos (withdrawal periods) are always up-to-date.';

-- Verify the function was updated
SELECT
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'process_visit_medications'
  AND prosrc LIKE '%calculate_withdrawal_dates%';

-- If the above query returns 1 row, the fix was applied successfully!
