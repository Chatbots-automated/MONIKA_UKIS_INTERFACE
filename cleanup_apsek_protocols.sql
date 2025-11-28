-- ONE-TIME CLEANUP SCRIPT
-- Run this AFTER applying the migration 20251128000000_auto_cancel_sync_on_apsek.sql
-- This will cancel all existing active synchronization protocols for animals that already have APSĖK status

-- This script is safe to run multiple times (idempotent)

DO $$
DECLARE
  v_animal_record RECORD;
  v_cancelled_count INTEGER;
  v_total_cancelled INTEGER := 0;
  v_total_animals INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting cleanup of APSĖK animal synchronization protocols...';

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
END $$;
