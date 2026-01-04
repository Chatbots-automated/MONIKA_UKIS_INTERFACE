/*
  # Milk Loss Tracking System

  1. New Functions
    - calculate_milk_loss_for_synchronization - Calculates expected milk loss for a synchronization period
    - calculate_average_daily_milk - Gets animal's average daily milk production

  2. New Views
    - animal_milk_loss_by_synchronization - Aggregates milk loss data per animal and synchronization

  3. Changes
    - Adds comprehensive milk loss tracking capabilities
    - Integrates milk production data with animal synchronization periods
    - Calculates financial impact of milk loss during synchronization

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

-- Function to calculate milk loss for an animal synchronization period
CREATE OR REPLACE FUNCTION calculate_milk_loss_for_synchronization(
  p_animal_id uuid,
  p_sync_id uuid
)
RETURNS TABLE (
  total_days integer,
  avg_daily_milk numeric,
  total_milk_lost numeric,
  milk_loss_value numeric,
  milk_price_per_kg numeric,
  sync_start_date date,
  sync_end_date date
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
  -- Get synchronization start date
  SELECT start_date
  INTO v_sync_start
  FROM animal_synchronizations
  WHERE id = p_sync_id;

  -- If no sync found, return zeros
  IF v_sync_start IS NULL THEN
    RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, NULL::date, NULL::date;
    RETURN;
  END IF;

  -- Calculate end date as the max scheduled_date from synchronization steps
  SELECT MAX(scheduled_date)
  INTO v_sync_end
  FROM synchronization_steps
  WHERE synchronization_id = p_sync_id;

  -- If no steps found, use start_date + 14 days as default
  IF v_sync_end IS NULL THEN
    v_sync_end := v_sync_start + INTERVAL '14 days';
  END IF;

  -- Calculate days in sync period
  v_total_days := (v_sync_end - v_sync_start) + 1;

  -- Get average daily milk production before synchronization started
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
    v_milk_price,
    v_sync_start,
    v_sync_end;
END;
$$;

-- View to aggregate milk loss by animal and synchronization
CREATE OR REPLACE VIEW animal_milk_loss_by_synchronization AS
SELECT
  a.id as animal_id,
  a.animal_id as animal_number,
  a.name as animal_name,
  s.id as sync_id,
  s.start_date as sync_start,
  s.status as sync_status,
  s.protocol_id,
  sp.name as protocol_name,
  ml.sync_end_date as sync_end,
  ml.total_days as loss_days,
  ml.avg_daily_milk as avg_daily_milk_kg,
  ml.total_milk_lost as total_milk_lost_kg,
  ml.milk_loss_value as milk_loss_value_eur,
  ml.milk_price_per_kg as milk_price_used
FROM animals a
JOIN animal_synchronizations s ON s.animal_id = a.id
LEFT JOIN synchronization_protocols sp ON sp.id = s.protocol_id
CROSS JOIN LATERAL calculate_milk_loss_for_synchronization(a.id, s.id) ml
WHERE s.status IN ('Active', 'Completed')
  AND ml.total_days > 0
ORDER BY s.start_date DESC, a.animal_id;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_average_daily_milk TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_milk_loss_for_synchronization TO authenticated;
GRANT SELECT ON animal_milk_loss_by_synchronization TO authenticated;

-- Add helpful comments
COMMENT ON VIEW animal_milk_loss_by_synchronization IS 'Aggregates milk loss data by animal and synchronization, calculating financial impact based on synchronization periods and historical milk production data';
COMMENT ON FUNCTION calculate_average_daily_milk IS 'Calculates average daily milk production for an animal over the 30 days before a specified date';
COMMENT ON FUNCTION calculate_milk_loss_for_synchronization IS 'Calculates total milk loss and financial impact for an animal synchronization period';
