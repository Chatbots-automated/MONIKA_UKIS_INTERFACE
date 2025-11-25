-- Fix the process_visit_medications function to cast unit properly
CREATE OR REPLACE FUNCTION process_visit_medications()
RETURNS TRIGGER AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
BEGIN
  IF NEW.status = 'Baigtas'
     AND (OLD.status IS NULL OR OLD.status != 'Baigtas')
     AND NEW.planned_medications IS NOT NULL
     AND NOT COALESCE(NEW.medications_processed, false) THEN

    RAISE NOTICE 'Processing medications for visit %', NEW.id;

    SELECT id INTO v_treatment_id
    FROM treatments
    WHERE visit_id = NEW.id
    LIMIT 1;

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

    FOR v_medication IN SELECT * FROM jsonb_array_elements(NEW.planned_medications)
    LOOP
      RAISE NOTICE 'Processing medication: %', v_medication;

      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

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

      DECLARE
        v_qty_in_primary_units decimal;
        v_current_stock decimal;
      BEGIN
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

        RAISE NOTICE 'Deducting % primary pack units from product %', v_qty_in_primary_units, v_product.id;

        SELECT on_hand INTO v_current_stock
        FROM stock_level
        WHERE product_id = (v_medication->>'product_id')::uuid;

        UPDATE stock_level
        SET on_hand = on_hand - v_qty_in_primary_units
        WHERE product_id = (v_medication->>'product_id')::uuid;

        RAISE NOTICE 'Stock updated. Previous: %, Deducted: %, New: %',
          v_current_stock, v_qty_in_primary_units, v_current_stock - v_qty_in_primary_units;
      END;
    END LOOP;

    NEW.medications_processed := true;
    RAISE NOTICE 'Marked medications as processed for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
