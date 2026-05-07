-- Recalculate all existing animal_departures records with the new logic
-- Only animals with vet_reason_code should have conflicts checked

DO $$
DECLARE
  v_departure_record RECORD;
  v_last_withdrawal_milk DATE;
  v_last_withdrawal_meat DATE;
  v_last_treatment_date DATE;
  v_has_conflict BOOLEAN;
  v_conflict_details TEXT;
BEGIN
  -- Loop through all departure records
  FOR v_departure_record IN 
    SELECT * FROM animal_departures
  LOOP
    -- Recalculate withdrawal dates for this animal
    IF v_departure_record.animal_id IS NOT NULL THEN
      SELECT 
        MAX(t.reg_date),
        MAX(t.withdrawal_until_milk),
        MAX(t.withdrawal_until_meat)
      INTO 
        v_last_treatment_date,
        v_last_withdrawal_milk,
        v_last_withdrawal_meat
      FROM treatments t
      WHERE t.animal_id = v_departure_record.animal_id;
      
      -- Check for conflicts (only if there's a veterinary reason code)
      v_has_conflict := false;
      v_conflict_details := '';
      
      IF v_departure_record.vet_reason_code IS NOT NULL AND v_departure_record.vet_reason_code != '' THEN
        IF v_last_withdrawal_milk IS NOT NULL AND v_departure_record.departure_date < v_last_withdrawal_milk THEN
          v_has_conflict := true;
          v_conflict_details := v_conflict_details || 
            'PIENO KARENCIJA: Išvežta ' || v_departure_record.departure_date || 
            ', bet pieno karencija baigiasi ' || v_last_withdrawal_milk || 
            ' (dar ' || (v_last_withdrawal_milk - v_departure_record.departure_date) || ' d.). ';
        END IF;
        
        IF v_last_withdrawal_meat IS NOT NULL AND v_departure_record.departure_date < v_last_withdrawal_meat THEN
          v_has_conflict := true;
          v_conflict_details := v_conflict_details || 
            'MĖSOS KARENCIJA: Išvežta ' || v_departure_record.departure_date || 
            ', bet mėsos karencija baigiasi ' || v_last_withdrawal_meat || 
            ' (dar ' || (v_last_withdrawal_meat - v_departure_record.departure_date) || ' d.). ';
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
      v_last_treatment_date := NULL;
      v_last_withdrawal_milk := NULL;
      v_last_withdrawal_meat := NULL;
      v_has_conflict := false;
    END IF;
    
    -- Update the departure record
    UPDATE animal_departures
    SET 
      last_treatment_date = v_last_treatment_date,
      last_withdrawal_milk = v_last_withdrawal_milk,
      last_withdrawal_meat = v_last_withdrawal_meat,
      has_withdrawal_conflict = v_has_conflict,
      conflict_details = v_conflict_details,
      updated_at = NOW()
    WHERE id = v_departure_record.id;
    
  END LOOP;
  
  RAISE NOTICE 'Successfully recalculated all departure records with new logic';
END;
$$;
