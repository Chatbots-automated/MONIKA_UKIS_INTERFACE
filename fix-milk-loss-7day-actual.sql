/*
  # Fix Milk Loss Calculations - Use 7-Day Average from milk_avg

  ## Problem
  Current functions use AVG(milk_avg) over 30 days.
  Need to use 7-day window for more accurate recent production tracking.

  ## Solution
  1. Use milk_avg field (Pieno vidurkis) from gea_daily
  2. Use 7-day window (more accurate for recent production changes)
  3. Apply this methodology consistently to both synchronization and treatment calculations

  ## Changes
  - Updates `calculate_average_daily_milk()` to use 7-day window instead of 30-day
  - Updates `get_animal_avg_milk_at_date()` to use 7-day window instead of 30-day
  - Both functions use milk_avg field (Pieno vidurkis)
  - Shortened window from 30 days to 7 days for more accurate recent production tracking

  ## Impact
  - Synchronization milk loss calculations will use 7-day average
  - Treatment milk loss calculations will use 7-day average
  - Both sections will show consistent values
  - Calculations based on Pieno vidurkis (milk_avg) field
*/

-- Function to calculate average daily milk production for an animal
-- Uses milk_avg (Pieno vidurkis) over 7 days before the given date
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
  -- Calculate average from milk_avg (Pieno vidurkis)
  -- Use 7-day window for more accurate recent production tracking
  SELECT COALESCE(AVG(milk_avg), 0)
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date < p_before_date
    AND snapshot_date >= (p_before_date - INTERVAL '7 days')
    AND milk_avg IS NOT NULL
    AND milk_avg > 0;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Function to get animal's average daily milk at a specific date
-- Uses milk_avg (Pieno vidurkis) over 7 days before the given date
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
  -- Get average from milk_avg (Pieno vidurkis) over 7 days before the given date
  SELECT COALESCE(AVG(milk_avg), 0)
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date < p_date
    AND snapshot_date >= (p_date - INTERVAL '7 days')
    AND milk_avg IS NOT NULL
    AND milk_avg > 0;

  -- If no data found in 7-day window, try to get most recent day's milk_avg
  IF v_avg_milk = 0 THEN
    SELECT COALESCE(milk_avg, 0)
    INTO v_avg_milk
    FROM gea_daily
    WHERE animal_id = p_animal_id
      AND snapshot_date <= p_date
      AND milk_avg IS NOT NULL
      AND milk_avg > 0
    ORDER BY snapshot_date DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Update comments to reflect new calculation method
COMMENT ON FUNCTION calculate_average_daily_milk IS 'Calculates average daily milk production for an animal using milk_avg (Pieno vidurkis) over the 7 days before a specified date';
COMMENT ON FUNCTION get_animal_avg_milk_at_date IS 'Gets animal average daily milk production at a specific date using milk_avg (Pieno vidurkis) from gea_daily over 7 days';
