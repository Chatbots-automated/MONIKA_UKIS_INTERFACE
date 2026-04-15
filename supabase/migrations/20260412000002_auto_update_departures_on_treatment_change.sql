-- Function to recalculate animal departure conflicts when treatments change
-- This ensures that when a treatment is transferred or modified, the departure record is updated

CREATE OR REPLACE FUNCTION recalculate_departure_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  v_departure_record RECORD;
  v_last_withdrawal_milk DATE;
  v_last_withdrawal_meat DATE;
  v_last_treatment_date DATE;
  v_has_conflict BOOLEAN;
  v_conflict_details TEXT;
BEGIN
  -- Get all departure records for this animal (both old and new if it's a transfer)
  FOR v_departure_record IN 
    SELECT * FROM animal_departures 
    WHERE animal_id = COALESCE(NEW.animal_id, OLD.animal_id)
       OR animal_id = OLD.animal_id -- For transfers, also update old animal
  LOOP
    -- Recalculate withdrawal dates for this animal
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
    
    -- Check for conflicts
    v_has_conflict := false;
    v_conflict_details := '';
    
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on treatments table
-- Fires when: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_recalculate_departures_on_treatment_change ON treatments;
CREATE TRIGGER trigger_recalculate_departures_on_treatment_change
  AFTER INSERT OR UPDATE OR DELETE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_departure_conflicts();

COMMENT ON FUNCTION recalculate_departure_conflicts IS 'Automatically recalculates animal departure conflicts when treatments are added, modified, or deleted (including transfers)';
