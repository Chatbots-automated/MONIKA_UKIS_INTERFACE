/*
  # Add Prevention Course Support

  ## Overview
  This migration extends the course medication system to support prevention (profilaktika) courses.

  ## Changes
  1. Update process_visit_medications function to handle both treatment AND prevention procedures
     - Creates usage_items for treatment medications (via treatments table)
     - Creates biocide_usage records for prevention medications (via biocide_usage table)
     - Properly processes planned_medications for both types

  ## How It Works
  - When a visit with Profilaktika procedure is marked as "Baigtas" (completed):
    - The function reads planned_medications from the visit
    - Creates biocide_usage records for each prevention product
    - Marks medications_processed = true to prevent double-deduction

  - For multi-day prevention courses (e.g., 3 boluses over 3 days):
    - Day 1: Creates visit with planned_medications, only deducts if completed
    - Day 2-3: Auto-creates future visits with planned_medications
    - Each day's visit only deducts medication when marked as "Baigtas"

  ## Security
  - Uses existing RLS policies on animal_visits and biocide_usage tables
  - Function runs with SECURITY DEFINER for proper permissions
*/

-- Update the process_visit_medications function to handle BOTH treatment and prevention
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
  v_visit_procedures text[];
  v_is_prevention boolean := false;
BEGIN
  -- Only process if status is changing TO "Baigtas" and medications haven't been processed yet
  IF NEW.status = 'Baigtas'
     AND (OLD.status IS NULL OR OLD.status != 'Baigtas')
     AND NEW.planned_medications IS NOT NULL
     AND NOT COALESCE(NEW.medications_processed, false) THEN

    RAISE NOTICE 'Processing medications for visit %', NEW.id;

    -- Check if this is a prevention visit
    v_visit_procedures := NEW.procedures;
    v_is_prevention := 'Profilaktika' = ANY(v_visit_procedures);

    -- Get the treatment_id for this visit (if exists and not prevention-only)
    SELECT id INTO v_treatment_id
    FROM treatments
    WHERE visit_id = NEW.id
    LIMIT 1;

    -- If no treatment exists yet and this visit requires treatment (not prevention), create one
    IF v_treatment_id IS NULL AND NEW.treatment_required AND NOT v_is_prevention THEN
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

      -- Get product details
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

      -- Determine if this is a prevention medication based on purpose
      IF v_is_prevention OR (v_medication->>'purpose') = 'Profilaktika' THEN
        -- Create biocide_usage record for prevention
        INSERT INTO biocide_usage (
          product_id,
          batch_id,
          use_date,
          purpose,
          work_scope,
          qty,
          unit,
          used_by_name
        ) VALUES (
          (v_medication->>'product_id')::uuid,
          (v_medication->>'batch_id')::uuid,
          DATE(NEW.visit_datetime),
          COALESCE(v_medication->>'purpose', 'Profilaktika'),
          'Gyvūnas: ' || NEW.animal_id::text,
          (v_medication->>'qty')::decimal,
          (v_medication->>'unit')::unit,
          NEW.vet_name
        );

        RAISE NOTICE 'Created biocide_usage for prevention. Product: %, Batch: %, Qty: % %',
          v_medication->>'product_id',
          v_medication->>'batch_id',
          v_medication->>'qty',
          COALESCE(v_medication->>'unit', 'ml');
      ELSE
        -- Create usage_item record for treatment if we have a treatment
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
      END IF;
    END LOOP;

    -- Mark medications as processed
    NEW.medications_processed := true;

    RAISE NOTICE 'Completed processing medications for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_visit_medications IS 'Automatically creates usage_items (treatment) or biocide_usage (prevention) when visit status changes to Baigtas. Supports multi-day courses for both treatment and prevention.';
