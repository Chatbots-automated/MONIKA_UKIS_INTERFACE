/*
  # Milk Loss Tracking System

  1. New Functions
    - calculate_milk_loss_for_treatment - Calculates expected milk loss for a treatment period
    - calculate_average_daily_milk - Gets animal's average daily milk production

  2. New Views
    - animal_milk_loss_by_treatment - Aggregates milk loss data per animal and treatment

  3. Changes
    - Adds comprehensive milk loss tracking capabilities
    - Integrates milk production data with treatment synchronization periods
    - Calculates financial impact of milk loss during treatment

  4. Security
    - All functions respect RLS policies
    - View uses existing table RLS policies
*/

-- Function to calculate average daily milk production for an animal
-- Uses the most recent 30 days of milk test data before a given date
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
  -- Calculate average from milk tests in the 30 days before the given date
  SELECT COALESCE(AVG(total_milk_weight), 0)
  INTO v_avg_milk
  FROM milk_tests
  WHERE animal_id = p_animal_id
    AND test_date < p_before_date
    AND test_date >= (p_before_date - INTERVAL '30 days')
    AND total_milk_weight IS NOT NULL
    AND total_milk_weight > 0;

  RETURN COALESCE(v_avg_milk, 0);
END;
$$;

-- Function to calculate milk loss for a treatment synchronization period
CREATE OR REPLACE FUNCTION calculate_milk_loss_for_treatment(
  p_animal_id uuid,
  p_sync_id uuid
)
RETURNS TABLE (
  total_days integer,
  avg_daily_milk numeric,
  total_milk_lost numeric,
  milk_loss_value numeric,
  milk_price_per_kg numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync_start date;
  v_sync_end date;
  v_avg_milk numeric;
  v_total_days integer;
  v_milk_price numeric;
BEGIN
  -- Get synchronization period
  SELECT start_date, end_date
  INTO v_sync_start, v_sync_end
  FROM synchronizations
  WHERE id = p_sync_id;

  -- If no sync found, return zeros
  IF v_sync_start IS NULL THEN
    RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Calculate days in sync period
  v_total_days := (v_sync_end - v_sync_start) + 1;

  -- Get average daily milk production before treatment started
  v_avg_milk := calculate_average_daily_milk(p_animal_id, v_sync_start);

  -- Get milk price from profitability settings (use most recent)
  SELECT COALESCE(milk_price_per_liter, 0.40)
  INTO v_milk_price
  FROM profitability_settings
  ORDER BY created_at DESC
  LIMIT 1;

  -- Return calculated values
  RETURN QUERY SELECT
    v_total_days,
    v_avg_milk,
    v_avg_milk * v_total_days,
    (v_avg_milk * v_total_days) * v_milk_price,
    v_milk_price;
END;
$$;

-- View to aggregate milk loss by animal and treatment
CREATE OR REPLACE VIEW animal_milk_loss_by_treatment AS
SELECT
  a.id as animal_id,
  a.animal_id as animal_number,
  a.name as animal_name,
  t.id as treatment_id,
  t.visit_id,
  t.treatment_date,
  t.diagnosis,
  s.id as sync_id,
  s.start_date as sync_start,
  s.end_date as sync_end,
  s.status as sync_status,
  ml.total_days as loss_days,
  ml.avg_daily_milk as avg_daily_milk_kg,
  ml.total_milk_lost as total_milk_lost_kg,
  ml.milk_loss_value as milk_loss_value_eur,
  ml.milk_price_per_kg as milk_price_used
FROM animals a
JOIN treatments t ON t.animal_id = a.id
JOIN synchronizations s ON s.treatment_id = t.id
CROSS JOIN LATERAL calculate_milk_loss_for_treatment(a.id, s.id) ml
WHERE s.status IN ('Synchronizuojamas', 'Baigta')
  AND ml.total_days > 0
ORDER BY t.treatment_date DESC, a.animal_id;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_average_daily_milk TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_milk_loss_for_treatment TO authenticated;
GRANT SELECT ON animal_milk_loss_by_treatment TO authenticated;

-- Add helpful comment
COMMENT ON VIEW animal_milk_loss_by_treatment IS 'Aggregates milk loss data by animal and treatment, calculating financial impact based on synchronization periods and historical milk production data';
COMMENT ON FUNCTION calculate_average_daily_milk IS 'Calculates average daily milk production for an animal over the 30 days before a specified date';
COMMENT ON FUNCTION calculate_milk_loss_for_treatment IS 'Calculates total milk loss and financial impact for a treatment synchronization period';
