-- Create batch upsert function for animal departures
-- This accepts an array of animals from N8N and processes them all at once

CREATE OR REPLACE FUNCTION batch_upsert_animal_departures(
  p_payload JSONB
)
RETURNS TABLE (
  total_processed INTEGER,
  animals_found INTEGER,
  conflicts_detected INTEGER,
  results JSONB
) AS $$
DECLARE
  v_animal JSONB;
  v_animal_id UUID;
  v_last_treatment_date DATE;
  v_last_withdrawal_milk DATE;
  v_last_withdrawal_meat DATE;
  v_has_conflict BOOLEAN;
  v_conflict_details TEXT;
  v_total INTEGER := 0;
  v_found INTEGER := 0;
  v_conflicts INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  -- Loop through each animal in the payload array
  FOR v_animal IN SELECT * FROM jsonb_array_elements(p_payload)
  LOOP
    v_total := v_total + 1;
    v_animal_id := NULL;
    v_has_conflict := false;
    v_conflict_details := '';
    
    -- Find the animal by tag number
    SELECT id INTO v_animal_id
    FROM public.animals
    WHERE tag_no = v_animal->>'Numeris'
    LIMIT 1;
    
    -- Get the latest withdrawal dates for this animal
    IF v_animal_id IS NOT NULL THEN
      v_found := v_found + 1;
      
      SELECT 
        MAX(t.reg_date),
        MAX(t.withdrawal_until_milk),
        MAX(t.withdrawal_until_meat)
      INTO 
        v_last_treatment_date,
        v_last_withdrawal_milk,
        v_last_withdrawal_meat
      FROM public.treatments t
      WHERE t.animal_id = v_animal_id;
      
      -- Only check for conflicts if there's a veterinary reason code
      IF v_animal->>'Vet. priež. Nr.' IS NOT NULL AND v_animal->>'Vet. priež. Nr.' != '' THEN
        -- Check for conflicts
        IF v_last_withdrawal_milk IS NOT NULL AND (v_animal->>'Data')::DATE < v_last_withdrawal_milk THEN
          v_has_conflict := true;
          v_conflicts := v_conflicts + 1;
          v_conflict_details := v_conflict_details || 
            'PIENO KARENCIJA: Išvežta ' || (v_animal->>'Data') || 
            ', bet pieno karencija baigiasi ' || v_last_withdrawal_milk || 
            ' (dar ' || (v_last_withdrawal_milk - (v_animal->>'Data')::DATE) || ' d.). ';
        END IF;
        
        IF v_last_withdrawal_meat IS NOT NULL AND (v_animal->>'Data')::DATE < v_last_withdrawal_meat THEN
          v_has_conflict := true;
          IF v_conflicts < v_total THEN
            v_conflicts := v_conflicts + 1;
          END IF;
          v_conflict_details := v_conflict_details || 
            'MĖSOS KARENCIJA: Išvežta ' || (v_animal->>'Data') || 
            ', bet mėsos karencija baigiasi ' || v_last_withdrawal_meat || 
            ' (dar ' || (v_last_withdrawal_meat - (v_animal->>'Data')::DATE) || ' d.). ';
        END IF;
        
        IF NOT v_has_conflict THEN
          v_conflict_details := 'Nėra karencijos konfliktų';
        END IF;
      ELSE
        -- No vet reason code, so no conflict check needed
        v_conflict_details := 'Nėra veterinarinės priežasties kodo';
      END IF;
    ELSE
      v_conflict_details := 'Gyvūnas nerastas duomenų bazėje (galbūt dar nesinchronizuotas iš VIC)';
    END IF;
    
    -- Upsert the departure record
    INSERT INTO public.animal_departures (
      animal_id,
      animal_number,
      departure_date,
      gender,
      birth_date,
      reason,
      vet_reason_code,
      destination_name,
      destination_herd_number,
      source_name,
      source_herd_number,
      entered_by,
      last_treatment_date,
      last_withdrawal_milk,
      last_withdrawal_meat,
      has_withdrawal_conflict,
      conflict_details,
      updated_at
    ) VALUES (
      v_animal_id,
      v_animal->>'Numeris',
      (v_animal->>'Data')::DATE,
      v_animal->>'Lytis',
      v_animal->>'Gimimo data',
      v_animal->>'Priežastis',
      v_animal->>'Vet. priež. Nr.',
      v_animal->>'Vardas, pavardė / pavadinimas',
      v_animal->>'Bandos numeris',
      v_animal->>'Vardas, pavardė/pavadinimas',
      v_animal->>'Bandos numeris_1',
      v_animal->>'Įvedėjas',
      v_last_treatment_date,
      v_last_withdrawal_milk,
      v_last_withdrawal_meat,
      v_has_conflict,
      v_conflict_details,
      NOW()
    )
    ON CONFLICT (animal_number, departure_date) 
    DO UPDATE SET
      animal_id = EXCLUDED.animal_id,
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      reason = EXCLUDED.reason,
      vet_reason_code = EXCLUDED.vet_reason_code,
      destination_name = EXCLUDED.destination_name,
      destination_herd_number = EXCLUDED.destination_herd_number,
      source_name = EXCLUDED.source_name,
      source_herd_number = EXCLUDED.source_herd_number,
      entered_by = EXCLUDED.entered_by,
      last_treatment_date = EXCLUDED.last_treatment_date,
      last_withdrawal_milk = EXCLUDED.last_withdrawal_milk,
      last_withdrawal_meat = EXCLUDED.last_withdrawal_meat,
      has_withdrawal_conflict = EXCLUDED.has_withdrawal_conflict,
      conflict_details = EXCLUDED.conflict_details,
      updated_at = NOW();
    
    -- Build result for this animal
    v_result := jsonb_build_object(
      'animal_number', v_animal->>'Numeris',
      'departure_date', v_animal->>'Data',
      'animal_found', (v_animal_id IS NOT NULL),
      'has_conflict', v_has_conflict,
      'conflict_message', v_conflict_details
    );
    
    v_results := v_results || v_result;
  END LOOP;
  
  -- Return summary
  RETURN QUERY SELECT 
    v_total,
    v_found,
    v_conflicts,
    v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION batch_upsert_animal_departures(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_upsert_animal_departures(JSONB) TO anon;

COMMENT ON FUNCTION batch_upsert_animal_departures(JSONB) IS 'Batch upserts animal departures from N8N. Accepts array of animals in payload field. Much more efficient than calling upsert_animal_departure per animal.';
