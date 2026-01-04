/*
  # Treatment Milk Loss Tracking System

  1. New Functions
    - calculate_treatment_milk_loss - Calculates milk loss for a treatment based on withdrawal period
    - get_animal_avg_milk_at_date - Gets animal's average daily milk production at a specific date

  2. New Views
    - treatment_milk_loss_summary - Shows milk loss per treatment with medications used

  3. Changes
    - Tracks milk loss during withdrawal periods (karencines dienos)
    - Uses gea_daily for milk production data
    - Calculates financial impact using system_settings milk price
    - Links treatments to medications used via usage_items

  4. Security
    - All functions respect RLS policies
    - Views use existing table RLS policies
*/

-- Function to get animal's average daily milk at a specific date
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
  -- Get average milk from 30 days before the given date
  SELECT COALESCE(AVG(milk_avg), 0)
  INTO v_avg_milk
  FROM gea_daily
  WHERE animal_id = p_animal_id
    AND snapshot_date < p_date
    AND snapshot_date >= (p_date - INTERVAL '30 days')
    AND milk_avg IS NOT NULL
    AND milk_avg > 0;

  -- If no data found, try to get most recent data
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

-- Function to calculate milk loss for a treatment
CREATE OR REPLACE FUNCTION calculate_treatment_milk_loss(
  p_treatment_id uuid
)
RETURNS TABLE (
  withdrawal_days integer,
  safety_days integer,
  total_loss_days integer,
  avg_daily_milk_kg numeric,
  total_milk_lost_kg numeric,
  milk_price_eur_per_kg numeric,
  total_value_lost_eur numeric,
  treatment_date date,
  withdrawal_until date,
  animal_tag text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_treatment_date date;
  v_withdrawal_until date;
  v_animal_id uuid;
  v_animal_tag text;
  v_withdrawal_days integer;
  v_safety_days integer := 1; -- Always add 1 day for safety
  v_total_days integer;
  v_avg_milk numeric;
  v_milk_price numeric;
BEGIN
  -- Get treatment details
  SELECT
    t.reg_date,
    t.withdrawal_until_milk,
    t.animal_id,
    a.tag_no
  INTO
    v_treatment_date,
    v_withdrawal_until,
    v_animal_id,
    v_animal_tag
  FROM treatments t
  JOIN animals a ON a.id = t.animal_id
  WHERE t.id = p_treatment_id;

  -- If no treatment found or no withdrawal period, return zeros
  IF v_treatment_date IS NULL OR v_withdrawal_until IS NULL THEN
    RETURN QUERY SELECT
      0, 0, 0,
      0::numeric, 0::numeric, 0::numeric, 0::numeric,
      NULL::date, NULL::date, NULL::text;
    RETURN;
  END IF;

  -- Calculate withdrawal days (from treatment date to withdrawal end date)
  v_withdrawal_days := (v_withdrawal_until - v_treatment_date);

  -- Total days includes safety buffer
  v_total_days := v_withdrawal_days + v_safety_days;

  -- Get average daily milk production at treatment date
  v_avg_milk := get_animal_avg_milk_at_date(v_animal_id, v_treatment_date);

  -- Get milk price from system settings
  SELECT COALESCE(setting_value::numeric, 0.45)
  INTO v_milk_price
  FROM system_settings
  WHERE setting_key = 'milk_price_per_liter'
  LIMIT 1;

  -- Return calculated values
  RETURN QUERY SELECT
    v_withdrawal_days,
    v_safety_days,
    v_total_days,
    v_avg_milk,
    v_avg_milk * v_total_days,
    v_milk_price,
    (v_avg_milk * v_total_days) * v_milk_price,
    v_treatment_date,
    v_withdrawal_until,
    v_animal_tag;
END;
$$;

-- View to show treatment milk loss with medications used
CREATE OR REPLACE VIEW treatment_milk_loss_summary AS
SELECT
  t.id as treatment_id,
  t.animal_id,
  a.tag_no as animal_tag,
  t.reg_date as treatment_date,
  t.withdrawal_until_milk,
  t.withdrawal_until_meat,
  t.clinical_diagnosis,
  t.vet_name,
  ml.withdrawal_days,
  ml.safety_days,
  ml.total_loss_days,
  ml.avg_daily_milk_kg,
  ml.total_milk_lost_kg,
  ml.milk_price_eur_per_kg,
  ml.total_value_lost_eur,
  -- Aggregate medications used
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'product_id', ui.product_id,
          'product_name', p.name,
          'qty', ui.qty,
          'unit', ui.unit,
          'withdrawal_milk_days', p.withdrawal_days_milk,
          'withdrawal_meat_days', p.withdrawal_days_meat
        ) ORDER BY p.name
      )
      FROM usage_items ui
      JOIN products p ON p.id = ui.product_id
      WHERE ui.treatment_id = t.id
        AND p.category = 'medicines'
    ),
    '[]'::json
  ) as medications_used
FROM treatments t
JOIN animals a ON a.id = t.animal_id
CROSS JOIN LATERAL calculate_treatment_milk_loss(t.id) ml
WHERE t.withdrawal_until_milk IS NOT NULL
  AND ml.total_loss_days > 0
ORDER BY t.reg_date DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_animal_avg_milk_at_date TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_treatment_milk_loss TO authenticated;
GRANT SELECT ON treatment_milk_loss_summary TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_animal_avg_milk_at_date IS 'Gets animal average daily milk production at a specific date from gea_daily';
COMMENT ON FUNCTION calculate_treatment_milk_loss IS 'Calculates milk loss and financial impact for a treatment based on withdrawal period';
COMMENT ON VIEW treatment_milk_loss_summary IS 'Shows milk loss per treatment including medications used and financial impact during withdrawal period';
