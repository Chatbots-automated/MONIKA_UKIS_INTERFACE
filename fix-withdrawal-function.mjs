import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
-- Drop and recreate the function with proper CTE scoping
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

  -- Calculate withdrawal dates in a SINGLE query with all CTEs properly scoped
  WITH course_withdrawals AS (
    -- Medicines with multi-day courses
    SELECT
      v_reg_date + tc.days + COALESCE(p.withdrawal_days_milk, 0) + 1 as milk_date,
      v_reg_date + tc.days + COALESCE(p.withdrawal_days_meat, 0) + 1 as meat_date
    FROM public.treatment_courses tc
    JOIN public.products p ON p.id = tc.product_id
    WHERE tc.treatment_id = p_treatment_id
      AND p.category = 'medicines'
  ),
  single_dose_withdrawals AS (
    -- Medicines with single doses (not in courses)
    SELECT
      v_reg_date + COALESCE(p.withdrawal_days_milk, 0) + 1 as milk_date,
      v_reg_date + COALESCE(p.withdrawal_days_meat, 0) + 1 as meat_date
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
  -- Calculate MAX dates in the same query
  SELECT
    MAX(milk_date),
    MAX(meat_date)
  INTO v_milk_until, v_meat_until
  FROM all_withdrawals;

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
`;

console.log('🔧 Fixing withdrawal calculation function...');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('✅ Function fixed successfully!');
console.log('\n📝 Now you can test creating a treatment with course duration.');
