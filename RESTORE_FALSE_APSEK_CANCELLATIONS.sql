-- ============================================================================
-- CRITICAL FIX: Restore 91 falsely cancelled synchronizations and fix trigger
-- ============================================================================
--
-- PROBLEM: 91 synchronization visits were falsely cancelled for animals that
-- do NOT have APSĖK status. The trigger was firing on every gea_daily update
-- regardless of whether the status actually changed TO APSĖK.
--
-- AFFECTED:
-- - 62 cancellations for animals with NVERŠ status
-- - 6 cancellations for animals with NESĖK status
-- - 23 cancellations for animals with PASIR status
--
-- ROOT CAUSE:
-- Line 95 in migration 20251128000000_auto_cancel_sync_on_apsek.sql:
-- "IF NEW.statusas = 'APSĖK' AND (TG_OP = 'INSERT' OR OLD.statusas IS DISTINCT FROM NEW.statusas)"
--
-- The condition "OLD.statusas IS DISTINCT FROM NEW.statusas" fires on ANY
-- row update, even when both OLD and NEW are the same non-APSĖK status.
--
-- SOLUTION:
-- 1. Fix trigger to ONLY fire when transitioning TO 'APSĖK'
-- 2. Restore all 91 falsely cancelled synchronizations
-- 3. Restore associated cancelled visits
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix the trigger logic
-- ============================================================================

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
  -- Normalize status values (trim whitespace, handle nulls)
  v_old_status := TRIM(COALESCE(OLD.statusas, ''));
  v_new_status := TRIM(COALESCE(NEW.statusas, ''));

  -- CRITICAL FIX: Only trigger when status is TRANSITIONING TO 'APSĖK'
  -- Must satisfy ALL conditions:
  -- 1. New status is exactly 'APSĖK'
  -- 2. Either it's a new INSERT with 'APSĖK', OR
  -- 3. It's an UPDATE where old status was NOT 'APSĖK' (actual transition)
  IF v_new_status = 'APSĖK' AND
     (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND v_old_status != 'APSĖK')) THEN

    RAISE NOTICE 'Auto-cancelling synchronizations for animal % - status transitioning to APSĖK (was: %)',
      NEW.animal_id, v_old_status;

    -- Cancel all active synchronization protocols for this animal
    v_cancelled_count := cancel_animal_synchronization_protocols(NEW.animal_id);

    IF v_cancelled_count > 0 THEN
      RAISE NOTICE 'Successfully cancelled % synchronization protocol(s)', v_cancelled_count;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_gea_daily_status_change IS
'Triggers auto-cancellation of synchronization protocols when animal status transitions TO APSĖK.
FIXED: Now only fires on actual status change to APSĖK, not on every row update.';

-- ============================================================================
-- STEP 2: Restore all falsely cancelled synchronizations
-- ============================================================================

DO $$
DECLARE
  v_reactivated_syncs INTEGER := 0;
  v_reactivated_visits INTEGER := 0;
BEGIN
  -- Reactivate synchronizations that were cancelled for non-APSĖK animals
  WITH reactivated_syncs AS (
    UPDATE animal_synchronizations asyn
    SET
      status = 'Active',
      notes = COALESCE(notes, '') || E'\n[' || NOW()::date || '] Automatiškai atkurta: klaidingas atšaukimas ištaisytas',
      updated_at = NOW()
    FROM gea_daily gd
    WHERE asyn.animal_id = gd.animal_id
      AND asyn.status = 'Cancelled'
      AND asyn.notes LIKE '%Automatiškai atšaukta dėl APSĖK statuso%'
      AND gd.statusas != 'APSĖK'
    RETURNING asyn.id
  )
  SELECT COUNT(*) INTO v_reactivated_syncs FROM reactivated_syncs;

  -- Reactivate associated visits that were cancelled
  WITH reactivated_visits AS (
    UPDATE animal_visits av
    SET
      status = 'Suplanuotas',
      notes = COALESCE(notes, '') || E'\n[' || NOW()::date || '] Automatiškai atkurta: klaidingas atšaukimas ištaisytas',
      updated_at = NOW()
    FROM synchronization_steps ss
    JOIN animal_synchronizations asyn ON asyn.id = ss.synchronization_id
    JOIN gea_daily gd ON gd.animal_id = asyn.animal_id
    WHERE av.sync_step_id = ss.id
      AND av.status = 'Atšauktas'
      AND av.notes LIKE '%Automatiškai atšaukta: gyvūnas apsėklintas (APSĖK statusas)%'
      AND gd.statusas != 'APSĖK'
    RETURNING av.id
  )
  SELECT COUNT(*) INTO v_reactivated_visits FROM reactivated_visits;

  RAISE NOTICE '✓ RESTORATION COMPLETE:';
  RAISE NOTICE '  - Reactivated % synchronization(s)', v_reactivated_syncs;
  RAISE NOTICE '  - Reactivated % visit(s)', v_reactivated_visits;
END $$;

-- ============================================================================
-- STEP 3: Verification - Confirm no false cancellations remain
-- ============================================================================

DO $$
DECLARE
  v_remaining_false INTEGER;
BEGIN
  SELECT COUNT(DISTINCT gd.animal_id) INTO v_remaining_false
  FROM gea_daily gd
  JOIN animal_synchronizations asyn ON asyn.animal_id = gd.animal_id
  WHERE gd.statusas != 'APSĖK'
    AND asyn.status = 'Cancelled'
    AND asyn.notes LIKE '%Automatiškai atšaukta dėl APSĖK statuso%';

  IF v_remaining_false > 0 THEN
    RAISE WARNING '⚠️ Still found % animal(s) with false cancellations - manual review needed', v_remaining_false;
  ELSE
    RAISE NOTICE '✓ VERIFICATION PASSED: No false cancellations remain';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Detailed report of restored animals
-- ============================================================================

WITH restored_animals AS (
  SELECT DISTINCT
    a.tag_no,
    gd.collar_no as neck_number,
    gd.statusas as current_status,
    COUNT(DISTINCT asyn.id) as syncs_restored,
    COUNT(DISTINCT av.id) as visits_restored
  FROM animals a
  JOIN gea_daily gd ON gd.animal_id = a.id
  JOIN animal_synchronizations asyn ON asyn.animal_id = a.id
  LEFT JOIN synchronization_steps ss ON ss.synchronization_id = asyn.id
  LEFT JOIN animal_visits av ON av.sync_step_id = ss.id
  WHERE asyn.notes LIKE '%Automatiškai atkurta: klaidingas atšaukimas ištaisytas%'
    AND asyn.updated_at::date = CURRENT_DATE
  GROUP BY a.tag_no, gd.collar_no, gd.statusas
  ORDER BY gd.collar_no
)
SELECT
  json_build_object(
    'total_animals_restored', (SELECT COUNT(*) FROM restored_animals),
    'total_syncs_restored', (SELECT SUM(syncs_restored) FROM restored_animals),
    'total_visits_restored', (SELECT SUM(visits_restored) FROM restored_animals),
    'restored_animals', (SELECT json_agg(row_to_json(restored_animals)) FROM restored_animals)
  )::text as restoration_report;
