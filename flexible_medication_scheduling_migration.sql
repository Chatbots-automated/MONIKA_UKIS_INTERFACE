/*
  # Flexible Per-Visit Medication Scheduling System

  ## Overview
  This migration transforms the medication course system from automatic quantity
  division to flexible per-visit scheduling. Users can now define which medications
  are used on which specific dates, and enter actual quantities at each visit.

  ## Changes Being Made

  1. **Fix NOT NULL constraints**
     - Allow NULL values in course_doses.dose_amount (quantity entered per visit)
     - Allow NULL values in treatment_courses fields (already done in previous migration)

  2. **Create medication schedule table**
     - New table: course_medication_schedules
     - Maps medications to specific visit dates within a course
     - Allows different medications on different days

  3. **Enhance existing tables**
     - Add medication_schedule_flexible flag to treatment_courses
     - Add course_id reference to animal_visits
     - Improve planned_medications handling

  4. **Helper functions**
     - Functions to manage course schedules
     - Functions to validate visit medication completion
     - Functions to update course progress

  ## Problem Being Solved

  The previous system automatically divided medication quantities across all course days,
  making it impossible to:
  - Use different medications on different days
  - Track actual per-visit usage accurately
  - Modify medication schedules flexibly

  This new system provides complete control over which medications are used when,
  with quantities entered only when each visit is actually completed.

  ## Security
  - Uses existing RLS policies on all tables
  - New table inherits standard authentication requirements
*/

-- ============================================================================
-- 1. FIX NOT NULL CONSTRAINTS
-- ============================================================================

-- Allow NULL in course_doses.dose_amount (quantity entered at visit completion)
DO $$
BEGIN
  -- Check if the constraint exists and alter if needed
  ALTER TABLE course_doses ALTER COLUMN dose_amount DROP NOT NULL;
  RAISE NOTICE 'Removed NOT NULL constraint from course_doses.dose_amount';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'course_doses.dose_amount already allows NULL or does not exist';
END $$;

COMMENT ON COLUMN course_doses.dose_amount IS 'Actual dose amount administered. NULL until visit is completed and quantity is entered.';

-- ============================================================================
-- 2. CREATE MEDICATION SCHEDULE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES treatment_courses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  batch_id uuid REFERENCES batches(id),
  scheduled_date date NOT NULL,
  visit_id uuid REFERENCES animal_visits(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'ml',
  teat text CHECK (teat IN ('d1', 'd2', 'k1', 'k2')),
  purpose text DEFAULT 'Gydymas',
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_course_med_date UNIQUE (course_id, product_id, scheduled_date, teat)
);

CREATE INDEX idx_course_medication_schedules_course ON course_medication_schedules(course_id);
CREATE INDEX idx_course_medication_schedules_visit ON course_medication_schedules(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX idx_course_medication_schedules_date ON course_medication_schedules(scheduled_date);

COMMENT ON TABLE course_medication_schedules IS 'Defines which medications should be used on which dates within a treatment course';
COMMENT ON COLUMN course_medication_schedules.scheduled_date IS 'The date when this medication should be administered';
COMMENT ON COLUMN course_medication_schedules.visit_id IS 'Links to the actual visit when scheduled. NULL until visit is created.';
COMMENT ON COLUMN course_medication_schedules.batch_id IS 'Batch can be NULL at scheduling time, selected at visit completion';

-- Enable RLS
ALTER TABLE course_medication_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view medication schedules"
  ON course_medication_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create medication schedules"
  ON course_medication_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update medication schedules"
  ON course_medication_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete medication schedules"
  ON course_medication_schedules FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. ENHANCE EXISTING TABLES
-- ============================================================================

-- Add medication_schedule_flexible flag to treatment_courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'treatment_courses' AND column_name = 'medication_schedule_flexible'
  ) THEN
    ALTER TABLE treatment_courses ADD COLUMN medication_schedule_flexible boolean DEFAULT false;
    COMMENT ON COLUMN treatment_courses.medication_schedule_flexible IS 'True if course uses flexible per-date medication scheduling';
  END IF;
END $$;

-- Add course_id reference to animal_visits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animal_visits' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE animal_visits ADD COLUMN course_id uuid REFERENCES treatment_courses(id) ON DELETE SET NULL;
    CREATE INDEX idx_animal_visits_course ON animal_visits(course_id) WHERE course_id IS NOT NULL;
    COMMENT ON COLUMN animal_visits.course_id IS 'Links visit to its parent treatment course';
  END IF;
END $$;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get scheduled medications for a visit date
CREATE OR REPLACE FUNCTION get_scheduled_medications_for_visit(
  p_course_id uuid,
  p_visit_date date
)
RETURNS TABLE (
  schedule_id uuid,
  product_id uuid,
  product_name text,
  batch_id uuid,
  unit text,
  teat text,
  purpose text,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cms.id,
    cms.product_id,
    p.name,
    cms.batch_id,
    cms.unit,
    cms.teat,
    cms.purpose,
    cms.notes
  FROM course_medication_schedules cms
  JOIN products p ON cms.product_id = p.id
  WHERE cms.course_id = p_course_id
    AND cms.scheduled_date = p_visit_date
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_scheduled_medications_for_visit IS 'Returns all medications scheduled for a specific visit date in a course';

-- Function: Check if course has flexible scheduling
CREATE OR REPLACE FUNCTION course_has_flexible_schedule(p_course_id uuid)
RETURNS boolean AS $$
DECLARE
  v_has_flexible boolean;
BEGIN
  SELECT medication_schedule_flexible INTO v_has_flexible
  FROM treatment_courses
  WHERE id = p_course_id;

  RETURN COALESCE(v_has_flexible, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get course progress
CREATE OR REPLACE FUNCTION get_course_progress(p_course_id uuid)
RETURNS TABLE (
  total_visits integer,
  completed_visits integer,
  pending_visits integer,
  next_visit_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_visits,
    COUNT(*) FILTER (WHERE status = 'Baigtas')::integer as completed_visits,
    COUNT(*) FILTER (WHERE status != 'Baigtas' AND status != 'Atšauktas')::integer as pending_visits,
    MIN(visit_datetime) FILTER (WHERE status != 'Baigtas' AND status != 'Atšauktas') as next_visit_date
  FROM animal_visits
  WHERE course_id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_course_progress IS 'Returns progress statistics for a treatment course';

-- Function: Validate visit medications before completion
CREATE OR REPLACE FUNCTION validate_visit_medications(p_visit_id uuid)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  missing_quantities integer
) AS $$
DECLARE
  v_planned_meds jsonb;
  v_med jsonb;
  v_missing_count integer := 0;
BEGIN
  -- Get planned medications
  SELECT planned_medications INTO v_planned_meds
  FROM animal_visits
  WHERE id = p_visit_id;

  -- If no medications, it's valid
  IF v_planned_meds IS NULL OR jsonb_array_length(v_planned_meds) = 0 THEN
    RETURN QUERY SELECT true, NULL::text, 0;
    RETURN;
  END IF;

  -- Check each medication has a quantity
  FOR v_med IN SELECT * FROM jsonb_array_elements(v_planned_meds)
  LOOP
    IF v_med->>'qty' IS NULL OR v_med->>'qty' = '' OR v_med->>'qty' = '0' THEN
      v_missing_count := v_missing_count + 1;
    END IF;
  END LOOP;

  -- Return validation result
  IF v_missing_count > 0 THEN
    RETURN QUERY SELECT
      false,
      'Prašome įvesti kiekius visiems vaistams (' || v_missing_count || ' trūksta)',
      v_missing_count;
  ELSE
    RETURN QUERY SELECT true, NULL::text, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_visit_medications IS 'Validates that all planned medications have quantities entered before visit completion';

-- Function: Link scheduled medications to created visit
CREATE OR REPLACE FUNCTION link_medications_to_visit(
  p_course_id uuid,
  p_visit_id uuid,
  p_visit_date date
)
RETURNS void AS $$
BEGIN
  UPDATE course_medication_schedules
  SET visit_id = p_visit_id
  WHERE course_id = p_course_id
    AND scheduled_date = p_visit_date
    AND visit_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_medications_to_visit IS 'Links medication schedule entries to their corresponding visit when visit is created';

-- ============================================================================
-- 5. CREATE HELPFUL VIEWS
-- ============================================================================

-- View: Course schedule overview
CREATE OR REPLACE VIEW vw_course_schedules AS
SELECT
  tc.id as course_id,
  tc.treatment_id,
  t.animal_id,
  a.tag_no,
  tc.days as total_days,
  tc.start_date,
  tc.medication_schedule_flexible,
  COUNT(DISTINCT cms.scheduled_date) as scheduled_dates,
  COUNT(DISTINCT cms.product_id) as unique_medications,
  COUNT(DISTINCT av.id) FILTER (WHERE av.status = 'Baigtas') as completed_visits,
  COUNT(DISTINCT av.id) FILTER (WHERE av.status != 'Baigtas' AND av.status != 'Atšauktas') as pending_visits,
  tc.status as course_status
FROM treatment_courses tc
JOIN treatments t ON tc.treatment_id = t.id
JOIN animals a ON t.animal_id = a.id
LEFT JOIN course_medication_schedules cms ON tc.id = cms.course_id
LEFT JOIN animal_visits av ON tc.id = av.course_id
WHERE tc.medication_schedule_flexible = true
GROUP BY tc.id, tc.treatment_id, t.animal_id, a.tag_no, tc.days, tc.start_date, tc.medication_schedule_flexible, tc.status;

COMMENT ON VIEW vw_course_schedules IS 'Overview of all flexible medication courses with progress tracking';

GRANT SELECT ON vw_course_schedules TO authenticated;

-- View: Visits needing medication entry (enhanced)
CREATE OR REPLACE VIEW vw_visits_needing_medication_entry AS
SELECT
  v.id,
  v.animal_id,
  v.visit_datetime,
  v.status,
  v.procedures,
  v.planned_medications,
  v.course_id,
  a.tag_no,
  a.species,
  CASE
    WHEN v.course_id IS NOT NULL THEN true
    ELSE false
  END as is_course_visit,
  COALESCE(jsonb_array_length(v.planned_medications), 0) as medication_count
FROM animal_visits v
JOIN animals a ON v.animal_id = a.id
WHERE v.status NOT IN ('Baigtas', 'Atšauktas')
  AND v.planned_medications IS NOT NULL
  AND v.medications_processed = false
  AND visit_needs_medication_entry(v.id) = true
ORDER BY v.visit_datetime ASC;

COMMENT ON VIEW vw_visits_needing_medication_entry IS 'Lists all incomplete visits requiring medication quantity entry';

GRANT SELECT ON vw_visits_needing_medication_entry TO authenticated;

-- ============================================================================
-- 6. DATA MIGRATION
-- ============================================================================

-- Mark all existing courses as non-flexible (they use old system)
UPDATE treatment_courses
SET medication_schedule_flexible = false
WHERE medication_schedule_flexible IS NULL;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Ensure realtime is enabled for new table
DO $$
BEGIN
  -- Enable realtime for course_medication_schedules
  ALTER PUBLICATION supabase_realtime ADD TABLE course_medication_schedules;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Realtime publication does not exist, skipping';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table already in realtime publication';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Flexible medication scheduling system migration completed successfully';
  RAISE NOTICE '   - Fixed NOT NULL constraints on course_doses';
  RAISE NOTICE '   - Created course_medication_schedules table';
  RAISE NOTICE '   - Enhanced treatment_courses and animal_visits tables';
  RAISE NOTICE '   - Created helper functions and views';
  RAISE NOTICE '   - All existing courses marked as non-flexible (old system)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Deploy updated frontend components';
  RAISE NOTICE '   2. Test course creation with flexible scheduling';
  RAISE NOTICE '   3. Test per-visit medication quantity entry';
  RAISE NOTICE '   4. Test course editing functionality';
END $$;
