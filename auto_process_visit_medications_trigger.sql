-- =====================================================
-- AUTO-PROCESS VISIT MEDICATIONS TRIGGER
-- =====================================================
-- This prevents the issue where medications are not recorded
-- when a visit is marked as "Baigtas" after creation.
--
-- Just copy this entire file and paste it into Supabase SQL Editor
-- then click RUN.
-- =====================================================

CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_max_withdrawal_meat integer := 0;
  v_max_withdrawal_milk integer := 0;
  v_product_withdrawal_meat integer;
  v_product_withdrawal_milk integer;
  v_treatment_date date;
  v_withdrawal_until_meat date;
  v_withdrawal_until_milk date;
BEGIN
  -- Only process if:
  -- 1. Status is changing to 'Baigtas'
  -- 2. There are planned medications
  -- 3. Medications haven't been processed yet
  IF NEW.status = 'Baigtas' AND
     (OLD.status IS NULL OR OLD.status != 'Baigtas') AND
     NEW.planned_medications IS NOT NULL AND
     jsonb_array_length(NEW.planned_medications) > 0 AND
     (NEW.medications_processed IS NULL OR NEW.medications_processed = false) THEN

    -- Get the associated treatment
    SELECT id, reg_date INTO v_treatment_id, v_treatment_date
    FROM treatments
    WHERE visit_id = NEW.id
    LIMIT 1;

    IF v_treatment_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Process each planned medication
    FOR v_medication IN SELECT * FROM jsonb_array_elements(NEW.planned_medications)
    LOOP
      -- Only create usage_item if we have product_id and batch_id
      IF v_medication->>'product_id' IS NOT NULL AND
         v_medication->>'batch_id' IS NOT NULL THEN

        -- Insert into usage_items (existing triggers will handle stock deduction)
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
          CASE
            WHEN v_medication->>'qty' IS NOT NULL
            THEN (v_medication->>'qty')::numeric
            ELSE NULL
          END,
          COALESCE(v_medication->>'unit', 'ml'),
          COALESCE(v_medication->>'purpose', 'Gydymas'),
          v_medication->>'teat'
        );

        -- Get withdrawal periods for this product
        SELECT
          COALESCE(withdrawal_days_meat, 0),
          COALESCE(withdrawal_days_milk, 0)
        INTO v_product_withdrawal_meat, v_product_withdrawal_milk
        FROM products
        WHERE id = (v_medication->>'product_id')::uuid;

        -- Track maximum withdrawal periods
        IF v_product_withdrawal_meat > v_max_withdrawal_meat THEN
          v_max_withdrawal_meat := v_product_withdrawal_meat;
        END IF;

        IF v_product_withdrawal_milk > v_max_withdrawal_milk THEN
          v_max_withdrawal_milk := v_product_withdrawal_milk;
        END IF;
      END IF;
    END LOOP;

    -- Calculate withdrawal dates
    IF v_max_withdrawal_meat > 0 THEN
      v_withdrawal_until_meat := v_treatment_date + (v_max_withdrawal_meat || ' days')::interval;
    END IF;

    IF v_max_withdrawal_milk > 0 THEN
      v_withdrawal_until_milk := v_treatment_date + (v_max_withdrawal_milk || ' days')::interval;
    END IF;

    -- Update treatment with withdrawal periods
    UPDATE treatments
    SET
      withdrawal_until_meat = v_withdrawal_until_meat,
      withdrawal_until_milk = v_withdrawal_until_milk
    WHERE id = v_treatment_id;

    -- Mark medications as processed
    NEW.medications_processed := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_process_visit_medications ON animal_visits;

CREATE TRIGGER auto_process_visit_medications
  BEFORE UPDATE ON animal_visits
  FOR EACH ROW
  EXECUTE FUNCTION process_visit_medications();

-- Success message will appear in Supabase
SELECT 'Trigger installed successfully!' as status;
