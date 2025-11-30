-- ============================================================================
-- FIX: Remove NOT NULL constraint from treatment_courses.batch_id
-- ============================================================================
--
-- IMPORTANT: Copy and paste this entire file into your Supabase SQL Editor and run it
--
-- This fixes the error: "null value in column batch_id of relation treatment_courses
-- violates not-null constraint"
--
-- WHY: The course scheduler workflow requires batch_id to be NULL when planning
-- multi-day courses, as batches are selected per visit rather than upfront.
-- ============================================================================

-- Remove NOT NULL constraint from batch_id
ALTER TABLE treatment_courses
ALTER COLUMN batch_id DROP NOT NULL;

-- Add comment explaining when batch_id is NULL vs populated
COMMENT ON COLUMN treatment_courses.batch_id IS
'Batch ID for the medication used in this course. NULL when course is planned but batch not yet selected (batch will be selected per visit). Populated when batch is selected upfront (legacy courses or immediate treatments).';

-- Verify the change was successful
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'treatment_courses'
  AND column_name = 'batch_id';

-- Should show: is_nullable = 'YES'
