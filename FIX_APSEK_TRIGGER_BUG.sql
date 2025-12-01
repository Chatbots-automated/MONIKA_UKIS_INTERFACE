-- ============================================================================
-- FIX: Prevent false auto-cancellation of sync visits for NVERŠ animals
-- ============================================================================
--
-- CRITICAL BUG: Synchronization visits are being falsely cancelled for animals
-- with NVERŠ status, showing "Automatiškai atšaukta: gyvūnas apsėklintas (APSĖK statusas)"
--
-- Examples:
-- - LT000009135889 (neck 832) - NVERŠ status → visits cancelled ❌
-- - LT000044226374 (neck 705) - NVERŠ status → visits cancelled ❌
--
-- ROOT CAUSE:
-- The trigger fires on INSERT OR UPDATE, but we need to be MORE SPECIFIC:
-- 1. Only trigger when status CHANGES TO 'APSĖK' (not when it's already 'APSĖK')
-- 2. Only trigger when status is EXACTLY 'APSĖK' (trim whitespace)
-- 3. Add logging to debug false triggers
--
-- SOLUTION:
-- Update the trigger condition to be more restrictive and add safeguards
-- ============================================================================

-- Updated trigger function with better logic and logging
CREATE OR REPLACE FUNCTION on_gea_daily_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Trim and normalize status values (in case of whitespace issues)
  v_old_status := TRIM(COALESCE(OLD.statusas, ''));
  v_new_status := TRIM(COALESCE(NEW.statusas, ''));

  -- Log for debugging (can be removed later if needed)
  RAISE NOTICE 'GEA status change detected - Animal: %, Old: %, New: %, Operation: %',
    NEW.animal_id, v_old_status, v_new_status, TG_OP;

  -- CRITICAL: Only trigger when status is CHANGING TO 'APSĖK'
  -- Must satisfy ALL conditions:
  -- 1. New status is EXACTLY 'APSĖK' (case-sensitive)
  -- 2. Either it's a new INSERT with 'APSĖK', OR
  -- 3. It's an UPDATE where old status was NOT 'APSĖK' (transitioning TO 'APSĖK')
  IF v_new_status = 'APSĖK' AND
     (TG_OP = 'INSERT' OR v_old_status != 'APSĖK') THEN

    RAISE NOTICE '✓ Triggering auto-cancellation for animal % - transitioning to APSĖK',
      NEW.animal_id;

    -- Cancel all active synchronization protocols for this animal
    v_cancelled_count := cancel_animal_synchronization_protocols(NEW.animal_id);

    -- Log the cancellation
    IF v_cancelled_count > 0 THEN
      RAISE NOTICE '✓ Auto-cancelled % synchronization protocol(s) for animal % due to APSĖK status',
        v_cancelled_count, NEW.animal_id;
    ELSE
      RAISE NOTICE 'ℹ No active synchronization protocols found for animal %', NEW.animal_id;
    END IF;

  ELSIF v_new_status = 'APSĖK' AND v_old_status = 'APSĖK' THEN
    -- Status is still APSĖK, no action needed
    RAISE NOTICE 'ℹ Animal % status remains APSĖK - no action taken', NEW.animal_id;

  ELSIF v_new_status != 'APSĖK' THEN
    -- Status is NOT APSĖK, should not trigger
    RAISE NOTICE 'ℹ Animal % status is % (not APSĖK) - no cancellation',
      NEW.animal_id, v_new_status;

  END IF;

  RETURN NEW;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION on_gea_daily_status_change IS
'Triggers auto-cancellation of synchronization protocols when animal status transitions TO APSĖK.
Only fires when:
1. New status is exactly APSĖK (trimmed, case-sensitive)
2. Status is changing TO APSĖK (not already APSĖK)
3. Prevents false triggers for NVERŠ, ATVIR, or other statuses';

-- Recreate the trigger (no changes to trigger itself, just ensuring it uses updated function)
DROP TRIGGER IF EXISTS trg_gea_status_apsek ON gea_daily;
CREATE TRIGGER trg_gea_status_apsek
  AFTER INSERT OR UPDATE OF statusas ON gea_daily
  FOR EACH ROW
  EXECUTE FUNCTION on_gea_daily_status_change();

-- Verification: Check if there are any animals with NVERŠ that have cancelled syncs
DO $$
DECLARE
  v_problem_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT gd.animal_id) INTO v_problem_count
  FROM gea_daily gd
  JOIN animal_synchronizations asyn ON asyn.animal_id = gd.animal_id
  WHERE gd.statusas = 'NVERŠ'
    AND asyn.status = 'Cancelled'
    AND asyn.notes LIKE '%APSĖK%';

  IF v_problem_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: Found % animal(s) with NVERŠ status that have cancelled synchronizations due to APSĖK. These need manual review.', v_problem_count;
  ELSE
    RAISE NOTICE '✓ No animals with NVERŠ status have incorrectly cancelled synchronizations';
  END IF;
END $$;

-- List the affected animals for manual review
SELECT
  a.tag_no,
  gd.collar_no as neck_number,
  gd.statusas as current_status,
  asyn.status as sync_status,
  asyn.notes as sync_notes
FROM animals a
JOIN gea_daily gd ON gd.animal_id = a.id
JOIN animal_synchronizations asyn ON asyn.animal_id = a.id
WHERE gd.statusas = 'NVERŠ'
  AND asyn.status = 'Cancelled'
  AND asyn.notes LIKE '%APSĖK%'
ORDER BY gd.collar_no;
