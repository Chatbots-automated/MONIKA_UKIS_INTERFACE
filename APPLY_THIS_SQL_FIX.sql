-- ============================================================================
-- STEP 1: APPLY THE MIGRATION
-- Copy and paste this entire file into your Supabase SQL Editor and run it
-- This will create the trigger and then fix all existing APSĖK animals
-- ============================================================================

-- Function to cancel all active synchronization protocols for an animal
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
    UPDATE animal_synchronizations
    SET
      status = 'Cancelled',
      notes = COALESCE(notes || E'\n\n', '') || 'Automatiškai atšaukta dėl APSĖK statuso (' || NOW()::DATE || ')',
      updated_at = NOW()
    WHERE id = v_sync_record.id;

    UPDATE synchronization_steps
    SET
      notes = COALESCE(notes || E'\n', '') || 'Atšaukta dėl APSĖK statuso',
      updated_at = NOW()
    WHERE synchronization_id = v_sync_record.id
      AND completed = FALSE;

    UPDATE animal_visits
    SET
      status = 'Atšauktas',
      notes = COALESCE(notes || E'\n\n', '') || 'Automatiškai atšaukta: gyvūnas apsėklintas (APSĖK statusas)',
      updated_at = NOW()
    WHERE sync_step_id IN (
      SELECT id
      FROM synchronization_steps
      WHERE synchronization_id = v_sync_record.id
        AND completed = FALSE
    )
    AND status != 'Baigtas';

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  RETURN v_cancelled_count;
END;
$$;

-- Trigger function to watch for GEA status changes to APSĖK
CREATE OR REPLACE FUNCTION on_gea_daily_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER;
BEGIN
  IF NEW.statusas = 'APSĖK' AND (TG_OP = 'INSERT' OR OLD.statusas IS DISTINCT FROM NEW.statusas) THEN
    v_cancelled_count := cancel_animal_synchronization_protocols(NEW.animal_id);

    IF v_cancelled_count > 0 THEN
      RAISE NOTICE 'Auto-cancelled % synchronization protocol(s) for animal % due to APSĖK status',
        v_cancelled_count, NEW.animal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on gea_daily table
DROP TRIGGER IF EXISTS trg_gea_status_apsek ON gea_daily;
CREATE TRIGGER trg_gea_status_apsek
  AFTER INSERT OR UPDATE OF statusas ON gea_daily
  FOR EACH ROW
  EXECUTE FUNCTION on_gea_daily_status_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cancel_animal_synchronization_protocols(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION on_gea_daily_status_change() TO authenticated;

-- ============================================================================
-- STEP 2: CLEANUP EXISTING APSĖK ANIMALS
-- This will fix all animals that already have APSĖK status
-- ============================================================================

DO $$
DECLARE
  v_animal_record RECORD;
  v_cancelled_count INTEGER;
  v_total_cancelled INTEGER := 0;
  v_total_animals INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting cleanup of APSĖK animal synchronization protocols...';
  RAISE NOTICE '========================================';

  -- Find all animals with APSĖK status
  FOR v_animal_record IN
    SELECT DISTINCT gd.animal_id, a.tag_no
    FROM gea_daily gd
    JOIN animals a ON a.id = gd.animal_id
    WHERE gd.statusas = 'APSĖK'
    ORDER BY a.tag_no
  LOOP
    v_total_animals := v_total_animals + 1;

    -- Cancel protocols for each animal
    SELECT cancel_animal_synchronization_protocols(v_animal_record.animal_id)
    INTO v_cancelled_count;

    IF v_cancelled_count > 0 THEN
      v_total_cancelled := v_total_cancelled + v_cancelled_count;
      RAISE NOTICE 'Animal % (ID: %): Cancelled % protocol(s)',
        v_animal_record.tag_no,
        v_animal_record.animal_id,
        v_cancelled_count;
    ELSE
      RAISE NOTICE 'Animal % (ID: %): No active protocols to cancel',
        v_animal_record.tag_no,
        v_animal_record.animal_id;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup completed!';
  RAISE NOTICE 'Total animals checked: %', v_total_animals;
  RAISE NOTICE 'Total protocols cancelled: %', v_total_cancelled;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The trigger is now active and will automatically cancel';
  RAISE NOTICE 'protocols when any animal status changes to APSĖK';
  RAISE NOTICE '========================================';
END $$;
