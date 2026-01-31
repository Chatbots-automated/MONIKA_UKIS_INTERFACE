-- =====================================================
-- FIX WITHDRAWAL CALCULATION TRIGGER
-- =====================================================
-- Problem: The calculate_withdrawal_dates function exists,
-- but there is NO TRIGGER calling it when medications are added.
-- This causes withdrawal dates to remain NULL.
--
-- Solution: Create trigger that automatically calculates
-- withdrawal dates when usage_items are inserted or updated.
-- =====================================================

-- Create trigger function
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

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS auto_calculate_withdrawal_on_usage ON usage_items;

-- Create trigger on usage_items
CREATE TRIGGER auto_calculate_withdrawal_on_usage
  AFTER INSERT OR UPDATE ON usage_items
  FOR EACH ROW
  WHEN (NEW.treatment_id IS NOT NULL)
  EXECUTE FUNCTION trigger_calculate_withdrawal_on_usage();

-- Also need trigger on treatment_courses for multi-day treatments
DROP TRIGGER IF EXISTS auto_calculate_withdrawal_on_course ON treatment_courses;

CREATE TRIGGER auto_calculate_withdrawal_on_course
  AFTER INSERT OR UPDATE ON treatment_courses
  FOR EACH ROW
  WHEN (NEW.treatment_id IS NOT NULL)
  EXECUTE FUNCTION trigger_calculate_withdrawal_on_usage();

-- Success message
SELECT 'Withdrawal calculation triggers created successfully!' as status;

-- Now recalculate all existing treatments that have NULL withdrawal dates
UPDATE treatments t
SET withdrawal_until_milk = NULL, withdrawal_until_meat = NULL
WHERE id IN (
  SELECT DISTINCT ui.treatment_id
  FROM usage_items ui
  WHERE ui.treatment_id IS NOT NULL
  AND (t.withdrawal_until_milk IS NULL OR t.withdrawal_until_meat IS NULL)
);

-- Force recalculation by calling function for all treatments with medications
DO $$
DECLARE
  treatment_rec RECORD;
BEGIN
  FOR treatment_rec IN
    SELECT DISTINCT t.id
    FROM treatments t
    INNER JOIN usage_items ui ON ui.treatment_id = t.id
    WHERE t.withdrawal_until_milk IS NULL OR t.withdrawal_until_meat IS NULL
  LOOP
    PERFORM calculate_withdrawal_dates(treatment_rec.id);
  END LOOP;
END $$;

SELECT 'Recalculated withdrawal dates for existing treatments!' as status;
