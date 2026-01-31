-- =====================================================
-- FIX: Add Automatic Withdrawal Calculation Trigger
-- =====================================================
-- Problem: The calculate_withdrawal_dates function exists but
-- is never called automatically, causing withdrawal dates to be NULL.
--
-- Solution: Create triggers that automatically call the function
-- when medications are added to treatments.
--
-- TO APPLY:
-- 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- =====================================================

-- Step 1: Create trigger function
CREATE OR REPLACE FUNCTION trigger_calculate_withdrawal_on_usage()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Call the withdrawal calculation function
  PERFORM calculate_withdrawal_dates(NEW.treatment_id);
  RETURN NEW;
END;
$$;

-- Step 2: Drop existing triggers if any
DROP TRIGGER IF EXISTS auto_calculate_withdrawal_on_usage ON usage_items;
DROP TRIGGER IF EXISTS auto_calculate_withdrawal_on_course ON treatment_courses;

-- Step 3: Create trigger on usage_items
CREATE TRIGGER auto_calculate_withdrawal_on_usage
  AFTER INSERT OR UPDATE ON usage_items
  FOR EACH ROW
  WHEN (NEW.treatment_id IS NOT NULL)
  EXECUTE FUNCTION trigger_calculate_withdrawal_on_usage();

-- Step 4: Create trigger on treatment_courses
CREATE TRIGGER auto_calculate_withdrawal_on_course
  AFTER INSERT OR UPDATE ON treatment_courses
  FOR EACH ROW
  WHEN (NEW.treatment_id IS NOT NULL)
  EXECUTE FUNCTION trigger_calculate_withdrawal_on_usage();

-- Step 5: Recalculate withdrawal dates for existing treatments with NULL values
DO $$
DECLARE
  treatment_rec RECORD;
  processed_count INT := 0;
BEGIN
  FOR treatment_rec IN
    SELECT DISTINCT t.id
    FROM treatments t
    INNER JOIN usage_items ui ON ui.treatment_id = t.id
    WHERE t.withdrawal_until_milk IS NULL OR t.withdrawal_until_meat IS NULL
  LOOP
    PERFORM calculate_withdrawal_dates(treatment_rec.id);
    processed_count := processed_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated withdrawal dates for % treatments', processed_count;
END $$;

-- Success!
SELECT 'Withdrawal calculation trigger applied successfully!' as status;
