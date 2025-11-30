/*
  # Migrate Future Visit Medications to Manual Entry System

  ## Overview
  This migration updates the medication entry workflow for treatment courses.
  Previously, when creating a multi-day treatment course, the total medication
  amount was divided automatically across all days. Now, each visit requires
  manual entry of the actual medication amount used.

  ## Changes Being Made

  1. **Update existing future visits**
     - Find all incomplete visits with planned_medications
     - Reset qty values to null for medications that haven't been processed
     - This forces manual entry of actual amounts used per visit

  2. **Add helper function**
     - Function to check if a visit needs medication quantity entry
     - Used by UI to determine if medication entry form should be shown

  ## Problem Being Solved

  Client feedback: The automatic division system made it difficult to track
  actual medication usage. When pre-calculated amounts were set, they couldn't
  verify if medications were actually administered or track remaining inventory
  accurately. Manual entry per visit provides full control and accurate tracking.

  ## Impact

  - Existing future visits (not yet completed) will require quantity entry
  - Already completed visits are not affected
  - New visits created after this migration will use the new workflow
  - Users will see "Kiekis neįvestas" indicator on migrated visits

  ## Security
  - Uses existing RLS policies on animal_visits table
  - No new permissions required
*/

-- Function to update planned_medications qty values to null
CREATE OR REPLACE FUNCTION reset_planned_medication_quantities(p_visit_id uuid)
RETURNS void AS $$
DECLARE
  v_medications jsonb;
  v_med jsonb;
  v_updated_medications jsonb := '[]'::jsonb;
BEGIN
  -- Get current planned_medications
  SELECT planned_medications INTO v_medications
  FROM animal_visits
  WHERE id = p_visit_id;

  -- If no medications, nothing to do
  IF v_medications IS NULL THEN
    RETURN;
  END IF;

  -- Loop through each medication and reset qty to null
  FOR v_med IN SELECT * FROM jsonb_array_elements(v_medications)
  LOOP
    v_updated_medications := v_updated_medications || jsonb_build_object(
      'product_id', v_med->>'product_id',
      'batch_id', v_med->>'batch_id',
      'qty', null,
      'unit', v_med->>'unit',
      'purpose', v_med->>'purpose',
      'teat', v_med->>'teat'
    );
  END LOOP;

  -- Update the visit with reset quantities
  UPDATE animal_visits
  SET planned_medications = v_updated_medications,
      notes = COALESCE(notes || E'\n\n', '') || '[Sistema atnaujinta: įveskite faktinį vaistų kiekį prieš užbaigiant vizitą]'
  WHERE id = p_visit_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if visit needs medication quantity entry
CREATE OR REPLACE FUNCTION visit_needs_medication_entry(p_visit_id uuid)
RETURNS boolean AS $$
DECLARE
  v_needs_entry boolean := false;
  v_medications jsonb;
  v_med jsonb;
BEGIN
  -- Get planned_medications for the visit
  SELECT planned_medications INTO v_medications
  FROM animal_visits
  WHERE id = p_visit_id
    AND status != 'Baigtas'
    AND medications_processed = false;

  -- If no medications, no entry needed
  IF v_medications IS NULL THEN
    RETURN false;
  END IF;

  -- Check if any medication has null qty
  FOR v_med IN SELECT * FROM jsonb_array_elements(v_medications)
  LOOP
    IF v_med->>'qty' IS NULL OR v_med->>'qty' = '' OR v_med->>'qty' = '0' THEN
      v_needs_entry := true;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_needs_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update all existing future visits that haven't been completed yet
-- This resets their medication quantities to null, requiring manual entry
DO $$
DECLARE
  v_visit record;
  v_count integer := 0;
BEGIN
  -- Find all incomplete visits with planned medications
  FOR v_visit IN
    SELECT id, visit_datetime, animal_id
    FROM animal_visits
    WHERE status NOT IN ('Baigtas', 'Atšauktas')
      AND planned_medications IS NOT NULL
      AND medications_processed = false
      AND visit_datetime >= CURRENT_DATE
  LOOP
    -- Reset quantities for this visit
    PERFORM reset_planned_medication_quantities(v_visit.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % future visits to manual medication entry system', v_count;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION reset_planned_medication_quantities IS 'Resets qty values in planned_medications to null, requiring manual entry before visit completion';
COMMENT ON FUNCTION visit_needs_medication_entry IS 'Returns true if a visit has planned_medications with null quantities that need to be entered';

-- Create a view to easily identify visits needing medication entry
CREATE OR REPLACE VIEW vw_visits_needing_medication_entry AS
SELECT
  v.id,
  v.animal_id,
  v.visit_datetime,
  v.status,
  v.procedures,
  v.planned_medications,
  a.tag_no,
  a.species
FROM animal_visits v
JOIN animals a ON v.animal_id = a.id
WHERE v.status NOT IN ('Baigtas', 'Atšauktas')
  AND v.planned_medications IS NOT NULL
  AND v.medications_processed = false
  AND visit_needs_medication_entry(v.id) = true
ORDER BY v.visit_datetime ASC;

COMMENT ON VIEW vw_visits_needing_medication_entry IS 'Lists all incomplete visits that require medication quantity entry before completion';

-- Grant permissions on the view
GRANT SELECT ON vw_visits_needing_medication_entry TO authenticated;
