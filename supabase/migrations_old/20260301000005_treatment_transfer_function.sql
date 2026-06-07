-- =============================================================================
-- TREATMENT TRANSFER FUNCTION
-- =============================================================================
-- This function transfers a treatment from one animal to another, including
-- all future/pending visits related to that treatment.
-- =============================================================================

CREATE OR REPLACE FUNCTION transfer_treatment_to_animal(
  p_treatment_id UUID,
  p_old_animal_id UUID,
  p_new_animal_id UUID,
  p_reason TEXT DEFAULT 'Treatment transferred via admin interface'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_treatment RECORD;
  v_old_animal RECORD;
  v_new_animal RECORD;
  v_course_ids UUID[];
  v_affected_visits INT := 0;
  v_result JSONB;
BEGIN
  -- Log the transfer attempt
  RAISE NOTICE 'Starting treatment transfer: treatment_id=%, old_animal=%, new_animal=%', 
    p_treatment_id, p_old_animal_id, p_new_animal_id;

  -- Validate old animal exists
  SELECT id, tag_no, species INTO v_old_animal
  FROM animals
  WHERE id = p_old_animal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Old animal not found: %', p_old_animal_id;
  END IF;

  -- Validate new animal exists
  SELECT id, tag_no, species INTO v_new_animal
  FROM animals
  WHERE id = p_new_animal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'New animal not found: %', p_new_animal_id;
  END IF;

  -- Validate treatment exists and belongs to old animal
  SELECT * INTO v_treatment
  FROM treatments
  WHERE id = p_treatment_id AND animal_id = p_old_animal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treatment not found or does not belong to old animal';
  END IF;

  -- Cannot transfer to same animal
  IF p_old_animal_id = p_new_animal_id THEN
    RAISE EXCEPTION 'Cannot transfer treatment to the same animal';
  END IF;

  -- Warn if species mismatch (but allow it)
  IF v_old_animal.species != v_new_animal.species THEN
    RAISE NOTICE 'Warning: Transferring treatment between different species (% -> %)', 
      v_old_animal.species, v_new_animal.species;
  END IF;

  -- Get all course IDs for this treatment
  SELECT ARRAY_AGG(id) INTO v_course_ids
  FROM treatment_courses
  WHERE treatment_id = p_treatment_id;

  RAISE NOTICE 'Found % courses for treatment', COALESCE(array_length(v_course_ids, 1), 0);

  -- Update the treatment's animal_id
  UPDATE treatments
  SET animal_id = p_new_animal_id,
      updated_at = NOW()
  WHERE id = p_treatment_id;

  RAISE NOTICE 'Updated treatment animal_id from % to %', p_old_animal_id, p_new_animal_id;

  -- Transfer all PENDING/FUTURE visits related to this treatment
  -- This includes:
  -- 1. Visits directly linked to the treatment (related_treatment_id)
  -- 2. Visits linked to courses of this treatment (course_id)
  UPDATE animal_visits
  SET animal_id = p_new_animal_id,
      updated_at = NOW()
  WHERE (
    related_treatment_id = p_treatment_id
    OR (course_id = ANY(v_course_ids) AND course_id IS NOT NULL)
  )
  AND status IN ('Planuojamas', 'Vykdomas')  -- Only pending/in-progress visits
  AND animal_id = p_old_animal_id;  -- Safety check

  GET DIAGNOSTICS v_affected_visits = ROW_COUNT;

  RAISE NOTICE 'Transferred % pending visits from animal % to animal %', 
    v_affected_visits, v_old_animal.tag_no, v_new_animal.tag_no;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', true,
    'treatment_id', p_treatment_id,
    'old_animal', jsonb_build_object(
      'id', v_old_animal.id,
      'tag_no', v_old_animal.tag_no,
      'species', v_old_animal.species
    ),
    'new_animal', jsonb_build_object(
      'id', v_new_animal.id,
      'tag_no', v_new_animal.tag_no,
      'species', v_new_animal.species
    ),
    'affected_visits', v_affected_visits,
    'course_count', COALESCE(array_length(v_course_ids, 1), 0),
    'reason', p_reason,
    'transferred_at', NOW()
  );

  RAISE NOTICE 'Transfer completed successfully';

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION transfer_treatment_to_animal(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_treatment_to_animal(UUID, UUID, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION transfer_treatment_to_animal IS 
'Transfers a treatment from one animal to another, including all pending/future visits. 
Completed visits remain with the original animal as historical records.';
