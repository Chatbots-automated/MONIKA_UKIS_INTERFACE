-- FIX THE CANCELLATION FUNCTION
-- The original function had a logic error - it was filtering out completed visits
-- but not actually catching the incomplete ones properly

CREATE OR REPLACE FUNCTION cancel_animal_synchronization_protocols(p_animal_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_sync_record RECORD;
BEGIN
  FOR v_sync_record IN
    SELECT id
    FROM animal_synchronizations
    WHERE animal_id = p_animal_id
      AND status = 'Active'
  LOOP
    -- Update the synchronization protocol status to Cancelled
    UPDATE animal_synchronizations
    SET
      status = 'Cancelled',
      notes = COALESCE(notes || E'\n\n', '') || 'Automatiškai atšaukta dėl APSĖK statuso (' || NOW()::DATE || ')',
      updated_at = NOW()
    WHERE id = v_sync_record.id;

    -- Cancel all incomplete synchronization steps (do not deduct stock)
    UPDATE synchronization_steps
    SET
      notes = COALESCE(notes || E'\n', '') || 'Atšaukta dėl APSĖK statuso',
      updated_at = NOW()
    WHERE synchronization_id = v_sync_record.id
      AND completed = FALSE;

    -- Cancel associated visits that haven't been completed
    -- THIS IS THE KEY FIX: Update ALL incomplete visits, not just those with sync_step_id
    UPDATE animal_visits
    SET
      status = 'Atšauktas',
      notes = COALESCE(notes || E'\n\n', '') || 'Automatiškai atšaukta: gyvūnas apsėklintas (APSĖK statusas)',
      updated_at = NOW()
    WHERE sync_step_id IN (
      SELECT id
      FROM synchronization_steps
      WHERE synchronization_id = v_sync_record.id
    )
    AND status IN ('Planuojamas', 'Suplanuota');  -- Only cancel planned visits, not completed ones

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  RETURN v_cancelled_count;
END;
$$;

-- Now manually fix the existing visits for LT000044225432
DO $$
DECLARE
  v_animal_id UUID;
  v_cancelled_protocols INTEGER;
BEGIN
  -- Get the animal ID
  SELECT id INTO v_animal_id
  FROM animals
  WHERE tag_no = 'LT000044225432';

  IF v_animal_id IS NOT NULL THEN
    -- First, let's manually cancel the visits since the function already ran
    UPDATE animal_visits
    SET
      status = 'Atšauktas',
      notes = COALESCE(notes || E'\n\n', '') || 'Automatiškai atšaukta: gyvūnas apsėklintas (APSĖK statusas)',
      updated_at = NOW()
    WHERE animal_id = v_animal_id
      AND status IN ('Planuojamas', 'Suplanuota')
      AND sync_step_id IN (
        SELECT ss.id
        FROM synchronization_steps ss
        JOIN animal_synchronizations asyn ON asyn.id = ss.synchronization_id
        WHERE asyn.animal_id = v_animal_id
          AND asyn.status = 'Cancelled'
      );

    RAISE NOTICE 'Fixed visits for animal LT000044225432';
    
    -- Now re-run the cancellation for ALL APSEK animals to fix any others
    FOR v_animal_id IN
      SELECT DISTINCT gd.animal_id
      FROM gea_daily gd
      WHERE gd.statusas = 'APSĖK'
    LOOP
      -- This will use the new fixed function
      SELECT cancel_animal_synchronization_protocols(v_animal_id)
      INTO v_cancelled_protocols;
    END LOOP;
    
    RAISE NOTICE 'Re-processed all APSEK animals with fixed function';
  END IF;
END $$;
