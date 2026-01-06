/*
  # Fix Milk Loss Calculations - Use 7-Day Average from Actual Daily Production

  ## Problem
  Current functions use AVG(milk_avg) over 30 days, which is "averaging an average" and mathematically incorrect.
  The milk_avg field is already a pre-calculated average from GEA system.

  ## Solution
  1. Calculate actual daily production by summing all milkings: m1_qty + m2_qty + m3_qty + m4_qty + m5_qty
  2. Use 7-day window (more accurate for recent production changes)
  3. Apply this methodology consistently to both synchronization and treatment calculations

  ## Changes
  - Updates `calculate_average_daily_milk()` to sum actual milkings over 7 days
  - Updates `get_animal_avg_milk_at_date()` to sum actual milkings over 7 days
  - Both functions now calculate from actual production data, not pre-averaged values
  - Shortened window from 30 days to 7 days for more accurate recent production tracking

  ## Impact
  - Synchronization milk loss calculations will be more accurate
  - Treatment milk loss calculations will be more accurate
  - Both sections will show consistent values
  - Individual animal GEA tab remains unchanged (still shows milk_avg from GEA)
*/

-- Function to calculate average daily milk production for an animal
-- Uses actual daily production (sum of all milkings) over 7 days before the given date
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
  -- Calculate average from ACTUAL daily production (sum of all milkings)
  -- Use 7-day window for more accurate recent production tracking
  SELECT COALESCE(
    AVG(
      COALESCE(m1_qty, 0) +
      COALESCE(m2_qty, 0) +
      COALESCE(m3_qty, 0) +
      COALESCE(m4_qty, 0) +
      COALESCE(m5_qty, 0)
    ),
    0
  )
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date < p_before_date
    AND snapshot_date >= (p_before_date - INTERVAL '7 days')
    AND (
      COALESCE(m1_qty, 0) +
      COALESCE(m2_qty, 0) +
      COALESCE(m3_qty, 0) +
      COALESCE(m4_qty, 0) +
      COALESCE(m5_qty, 0)
    ) > 0;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Function to get animal's average daily milk at a specific date
-- Uses actual daily production (sum of all milkings) over 7 days before the given date
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
  -- Get average from ACTUAL daily production over 7 days before the given date
  SELECT COALESCE(
    AVG(
      COALESCE(m1_qty, 0) +
      COALESCE(m2_qty, 0) +
      COALESCE(m3_qty, 0) +
      COALESCE(m4_qty, 0) +
      COALESCE(m5_qty, 0)
    ),
    0
  )
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date < p_date
    AND snapshot_date >= (p_date - INTERVAL '7 days')
    AND (
      COALESCE(m1_qty, 0) +
      COALESCE(m2_qty, 0) +
      COALESCE(m3_qty, 0) +
      COALESCE(m4_qty, 0) +
      COALESCE(m5_qty, 0)
    ) > 0;

  -- If no data found in 7-day window, try to get most recent day's production
  IF v_avg_milk = 0 THEN
    SELECT COALESCE(
      (
        COALESCE(m1_qty, 0) +
        COALESCE(m2_qty, 0) +
        COALESCE(m3_qty, 0) +
        COALESCE(m4_qty, 0) +
        COALESCE(m5_qty, 0)
      ),
      0
    )
    INTO v_avg_milk
    FROM gea_daily
    WHERE animal_id = p_animal_id
      AND snapshot_date <= p_date
      AND (
        COALESCE(m1_qty, 0) +
        COALESCE(m2_qty, 0) +
        COALESCE(m3_qty, 0) +
        COALESCE(m4_qty, 0) +
        COALESCE(m5_qty, 0)
      ) > 0
    ORDER BY snapshot_date DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Update comments to reflect new calculation method
COMMENT ON FUNCTION calculate_average_daily_milk IS 'Calculates average daily milk production for an animal by summing actual milkings over the 7 days before a specified date';
COMMENT ON FUNCTION get_animal_avg_milk_at_date IS 'Gets animal average daily milk production at a specific date by summing actual milkings from gea_daily over 7 days';
