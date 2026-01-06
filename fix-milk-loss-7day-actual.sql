/*
  # Fix Milk Loss Calculations - Use milk_avg Directly

  ## Problem
  Current functions calculate averages of the milk_avg field, which is already an average.
  This is "averaging an average" which is unnecessary.

  ## Solution
  Use milk_avg field (Pieno vidurkis) directly from gea_daily without additional averaging.
  The milk_avg is already the average calculated by GEA system.

  ## Changes
  - Updates `calculate_average_daily_milk()` to use latest milk_avg directly
  - Updates `get_animal_avg_milk_at_date()` to use milk_avg at specific date directly
  - No additional averaging calculations needed

  ## Impact
  - Synchronization milk loss calculations will use milk_avg (Pieno vidurkis) directly
  - Treatment milk loss calculations will use milk_avg (Pieno vidurkis) directly
  - Both sections will show consistent values
  - Simpler and more accurate calculations
*/

-- Function to calculate average daily milk production for an animal
-- Uses milk_avg (Pieno vidurkis) directly without additional averaging
CREATE OR REPLACE FUNCTION calculate_average_daily_milk(
  p_animal_id uuid,
  p_before_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_milk numeric;
BEGIN
  -- Get the latest milk_avg (Pieno vidurkis) before the specified date
  -- This is already an average calculated by GEA, no additional averaging needed
  SELECT COALESCE(milk_avg, 0)
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date < p_before_date
    AND milk_avg IS NOT NULL
    AND milk_avg > 0
  ORDER BY snapshot_date DESC
  LIMIT 1;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Function to get animal's average daily milk at a specific date
-- Uses milk_avg (Pieno vidurkis) directly without additional averaging
CREATE OR REPLACE FUNCTION get_animal_avg_milk_at_date(
  p_animal_id uuid,
  p_date date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_milk numeric;
BEGIN
  -- Get the latest milk_avg (Pieno vidurkis) at or before the specified date
  -- This is already an average calculated by GEA, no additional averaging needed
  SELECT COALESCE(milk_avg, 0)
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date <= p_date
    AND milk_avg IS NOT NULL
    AND milk_avg > 0
  ORDER BY snapshot_date DESC
  LIMIT 1;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Update comments to reflect new calculation method
COMMENT ON FUNCTION calculate_average_daily_milk IS 'Gets the latest milk_avg (Pieno vidurkis) for an animal before a specified date - no additional averaging needed';
COMMENT ON FUNCTION get_animal_avg_milk_at_date IS 'Gets the latest milk_avg (Pieno vidurkis) for an animal at a specific date - no additional averaging needed';
