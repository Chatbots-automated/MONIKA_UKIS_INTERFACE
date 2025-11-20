/*
  # Fix Withdrawal Calculation to Respect Zero Withdrawal Days

  1. Issue
    - Products with 0 withdrawal days still contribute to the MAX calculation
    - Example: Medicine A (3-day course, 0 milk withdrawal) + Medicine B (0 days, 5 milk withdrawal)
      - Old: Shows withdrawal date even though one medicine has 0
      - New: Only shows withdrawal for products that actually have withdrawal > 0

  2. Solution
    - Filter to only include products where withdrawal_days > 0
    - If all products have 0 withdrawal, result will be NULL (no withdrawal)
*/

DROP FUNCTION IF EXISTS public.calculate_withdrawal_dates(uuid);

CREATE OR REPLACE FUNCTION public.calculate_withdrawal_dates(p_treatment_id uuid)
RETURNS void AS $$
DECLARE
  v_reg_date date;
  v_milk_until date;
  v_meat_until date;
BEGIN
  -- Get the treatment registration date
  SELECT reg_date INTO v_reg_date
  FROM public.treatments
  WHERE id = p_treatment_id;

  -- Calculate milk withdrawal considering EACH medicine's course duration
  -- ONLY for products that actually have withdrawal days > 0
  WITH course_withdrawals AS (
    -- Medicines with multi-day courses that have withdrawal periods
    SELECT
      v_reg_date + tc.days + p.withdrawal_days_milk + 1 as milk_date,
      v_reg_date + tc.days + p.withdrawal_days_meat + 1 as meat_date
    FROM public.treatment_courses tc
    JOIN public.products p ON p.id = tc.product_id
    WHERE tc.treatment_id = p_treatment_id
      AND p.category = 'medicines'
      AND (p.withdrawal_days_milk > 0 OR p.withdrawal_days_meat > 0)
  ),
  single_dose_withdrawals AS (
    -- Medicines with single doses that have withdrawal periods
    SELECT
      v_reg_date + p.withdrawal_days_milk + 1 as milk_date,
      v_reg_date + p.withdrawal_days_meat + 1 as meat_date
    FROM public.usage_items ui
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.treatment_id = p_treatment_id
      AND p.category = 'medicines'
      AND (p.withdrawal_days_milk > 0 OR p.withdrawal_days_meat > 0)
      -- Only count single doses (not part of a course)
      AND NOT EXISTS (
        SELECT 1 FROM public.treatment_courses tc
        WHERE tc.treatment_id = p_treatment_id
          AND tc.product_id = ui.product_id
      )
  ),
  all_withdrawals AS (
    SELECT milk_date, meat_date FROM course_withdrawals
    UNION ALL
    SELECT milk_date, meat_date FROM single_dose_withdrawals
  )
  -- For milk: only consider dates where withdrawal_days_milk was > 0
  SELECT
    MAX(milk_date) INTO v_milk_until
  FROM all_withdrawals
  WHERE milk_date IS NOT NULL
    AND milk_date <> v_reg_date + 1;  -- Exclude products with 0 withdrawal (they'd give reg_date + 0 + 1)

  -- For meat: only consider dates where withdrawal_days_meat was > 0
  SELECT
    MAX(meat_date) INTO v_meat_until
  FROM all_withdrawals
  WHERE meat_date IS NOT NULL
    AND meat_date <> v_reg_date + 1;  -- Exclude products with 0 withdrawal

  -- Update the treatment with calculated dates (will be NULL if all products have 0 withdrawal)
  UPDATE public.treatments
  SET
    withdrawal_until_milk = v_milk_until,
    withdrawal_until_meat = v_meat_until
  WHERE id = p_treatment_id;

  RAISE NOTICE 'Treatment ID: %, Reg Date: %, Milk Until: %, Meat Until: %',
    p_treatment_id, v_reg_date, v_milk_until, v_meat_until;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_withdrawal_dates IS
'Calculates withdrawal periods for EACH medicine individually.
Only includes products with withdrawal_days > 0.
If all medicines have 0 withdrawal days, the result is NULL (no withdrawal period).

Example:
- Medicine A: 3-day course, 0 milk withdrawal, 5 meat withdrawal
- Medicine B: single dose, 3 milk withdrawal, 0 meat withdrawal
Result: Milk = reg_date + 0 + 3 + 1, Meat = reg_date + 3 + 5 + 1';
