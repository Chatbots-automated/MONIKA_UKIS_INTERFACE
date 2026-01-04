/*
  # Fix Milk Loss Calculation - Remove Double Safety Day

  ## Problem
  The calculate_treatment_milk_loss function is adding an extra safety day.

  The withdrawal_until_milk date ALREADY includes the safety day (calculated by
  calculate_withdrawal_dates), but calculate_treatment_milk_loss is adding
  another safety day on top of it.

  Example:
  - Treatment: 2025-11-26
  - Withdrawal: 5 days
  - Safety: 1 day
  - withdrawal_until_milk: 2025-12-02 (already includes safety)
  - Days difference: 2025-12-02 - 2025-11-26 = 6 days (correct!)

  Current (WRONG): 6 + 1 = 7 days
  Correct: 6 days (no additional safety needed)

  ## Solution
  Remove the extra safety day addition in calculate_treatment_milk_loss.
  The withdrawal_until date is the final date, so just use the difference.
*/

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
  v_safety_days integer := 1; -- Safety day is already included in withdrawal_until
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
  -- This already includes the safety day that was added by calculate_withdrawal_dates
  v_withdrawal_days := (v_withdrawal_until - v_treatment_date);

  -- Total days is just the withdrawal days (safety already included in withdrawal_until)
  v_total_days := v_withdrawal_days;

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

COMMENT ON FUNCTION calculate_treatment_milk_loss IS
'Calculates milk loss and financial impact for a treatment based on withdrawal period.
NOTE: The withdrawal_until date already includes the safety day, so we do not add it again.
Total loss days = withdrawal_until - treatment_date (safety already included).';
