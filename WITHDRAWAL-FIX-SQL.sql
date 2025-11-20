-- Fix Withdrawal Calculation to Respect Zero Withdrawal Days
-- Copy and paste this into Supabase SQL Editor

DROP FUNCTION IF EXISTS public.calculate_withdrawal_dates(uuid);

CREATE OR REPLACE FUNCTION public.calculate_withdrawal_dates(p_treatment_id uuid)
RETURNS void AS $$
DECLARE
  v_reg_date date;
  v_milk_until date;
  v_meat_until date;
BEGIN
  SELECT reg_date INTO v_reg_date FROM public.treatments WHERE id = p_treatment_id;

  -- MILK: Only products with withdrawal_days_milk > 0
  WITH course_milk AS (
    SELECT v_reg_date + tc.days + p.withdrawal_days_milk + 1 as wd
    FROM public.treatment_courses tc
    JOIN public.products p ON p.id = tc.product_id
    WHERE tc.treatment_id = p_treatment_id 
      AND p.category = 'medicines' 
      AND p.withdrawal_days_milk > 0
  ),
  single_milk AS (
    SELECT v_reg_date + p.withdrawal_days_milk + 1 as wd
    FROM public.usage_items ui
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.treatment_id = p_treatment_id 
      AND p.category = 'medicines' 
      AND p.withdrawal_days_milk > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.treatment_courses tc 
        WHERE tc.treatment_id = p_treatment_id 
          AND tc.product_id = ui.product_id
      )
  ),
  all_milk AS (
    SELECT wd FROM course_milk 
    UNION ALL 
    SELECT wd FROM single_milk
  )
  SELECT MAX(wd) INTO v_milk_until FROM all_milk;

  -- MEAT: Only products with withdrawal_days_meat > 0
  WITH course_meat AS (
    SELECT v_reg_date + tc.days + p.withdrawal_days_meat + 1 as wd
    FROM public.treatment_courses tc
    JOIN public.products p ON p.id = tc.product_id
    WHERE tc.treatment_id = p_treatment_id 
      AND p.category = 'medicines' 
      AND p.withdrawal_days_meat > 0
  ),
  single_meat AS (
    SELECT v_reg_date + p.withdrawal_days_meat + 1 as wd
    FROM public.usage_items ui
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.treatment_id = p_treatment_id 
      AND p.category = 'medicines' 
      AND p.withdrawal_days_meat > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.treatment_courses tc 
        WHERE tc.treatment_id = p_treatment_id 
          AND tc.product_id = ui.product_id
      )
  ),
  all_meat AS (
    SELECT wd FROM course_meat 
    UNION ALL 
    SELECT wd FROM single_meat
  )
  SELECT MAX(wd) INTO v_meat_until FROM all_meat;

  UPDATE public.treatments 
  SET withdrawal_until_milk = v_milk_until, 
      withdrawal_until_meat = v_meat_until 
  WHERE id = p_treatment_id;
END;
$$ LANGUAGE plpgsql;

-- Recalculate all treatments
DO $$
DECLARE
  treatment_rec RECORD;
BEGIN
  FOR treatment_rec IN SELECT id FROM treatments ORDER BY reg_date DESC
  LOOP
    PERFORM calculate_withdrawal_dates(treatment_rec.id);
  END LOOP;
  RAISE NOTICE 'Recalculated all treatments';
END $$;
