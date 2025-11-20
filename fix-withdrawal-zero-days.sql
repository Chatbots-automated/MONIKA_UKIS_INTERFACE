/*
  # Fix Withdrawal Calculation to Respect Zero Withdrawal Days

  1. Changes
    - Only calculate withdrawal dates for products that have withdrawal_days > 0
    - If all products have 0 withdrawal days, the withdrawal_until should be NULL
    - If mixed (some 0, some > 0), only consider the ones with actual withdrawal periods

  2. Logic
    - Filter out products with withdrawal_days_milk = 0 or NULL for milk calculation
    - Filter out products with withdrawal_days_meat = 0 or NULL for meat calculation
    - This ensures products with 0 withdrawal don't contribute to the MAX calculation
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
    -- Medicines with multi-day courses
    SELECT
      v_reg_date + tc.days + p.withdrawal_days_milk + 1 as milk_date,
      v_reg_date + tc.days + p.withdrawal_days_meat + 1 as meat_date
    FROM public.treatment_courses tc
    JOIN public.products p ON p.id = tc.product_id
    WHERE tc.treatment_id = p_treatment_id
      AND p.category = 'medicines'
  ),
  single_dose_withdrawals AS (
    -- Medicines with single doses (not in courses)
    SELECT
      v_reg_date + p.withdrawal_days_milk + 1 as milk_date,
      v_reg_date + p.withdrawal_days_meat + 1 as meat_date
    FROM public.usage_items ui
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.treatment_id = p_treatment_id
      AND p.category = 'medicines'
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
  -- For milk: only consider products with withdrawal_days_milk > 0
  SELECT
    MAX(milk_date) INTO v_milk_until
  FROM all_withdrawals
  WHERE milk_date IS NOT NULL
    AND milk_date > v_reg_date + 1;  -- Only if there's actual withdrawal (more than just +1 day)

  -- For meat: only consider products with withdrawal_days_meat > 0
  SELECT
    MAX(meat_date) INTO v_meat_until
  FROM all_withdrawals
  WHERE meat_date IS NOT NULL
    AND meat_date > v_reg_date + 1;  -- Only if there's actual withdrawal (more than just +1 day)

  -- Update the treatment with calculated dates
  UPDATE public.treatments
  SET
    withdrawal_until_milk = v_milk_until,
    withdrawal_until_meat = v_meat_until
  WHERE id = p_treatment_id;

  -- Log for debugging
  RAISE NOTICE 'Treatment ID: %, Reg Date: %, Milk Until: %, Meat Until: %',
    p_treatment_id, v_reg_date, v_milk_until, v_meat_until;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_withdrawal_dates IS
'Calculates withdrawal periods for EACH medicine individually based on its course duration.
Formula: withdrawal_date = start_date + course_days + withdrawal_days + 1 (for courses)
         withdrawal_date = start_date + withdrawal_days + 1 (for single doses)
Takes the MAXIMUM across all medicines that HAVE withdrawal periods (> 0 days).
Products with 0 withdrawal days are excluded from the calculation.

Example:
- Treatment starts: Day 6
- Medicine 1: 3-day course, 0-day milk withdrawal → NOT INCLUDED in milk calculation
- Medicine 2: 3-day course, 5-day milk withdrawal → 6 + 3 + 5 + 1 = Day 15
Result: Milk withdrawal until Day 15 (only Medicine 2 counts)';
