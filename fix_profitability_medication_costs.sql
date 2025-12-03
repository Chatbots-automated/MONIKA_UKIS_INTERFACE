/*
  # Fix Profitability Medication Cost Calculation

  ## Problem
  The `vw_animal_profitability` view has TWO bugs:

  1. Missing synchronization medication costs (stored in synchronization_steps table)
  2. CARTESIAN PRODUCT causing 6x multiplication when joining visits + sync_steps

  ## Root Cause
  When we JOIN both animal_visits AND synchronization_steps to the same animal:
  - 6 visits × 6 sync steps = 36 rows in the result set
  - SUM() counts each sync medication cost 6 times (once per visit)
  - Example: €3.06 actual cost → €18.36 reported (6x multiplication)

  ## Solution
  Calculate costs in SEPARATE subqueries/CTEs to avoid cartesian products:
  1. Treatment costs CTE (with visits for counting)
  2. Sync costs CTE (separate, independent)
  3. Combine using LEFT JOIN (not GROUP BY together)
*/

-- Drop and recreate the view with fixed medication cost calculation
CREATE OR REPLACE VIEW vw_animal_profitability AS
WITH treatment_costs AS (
  -- Calculate treatment-related costs and visit counts
  SELECT
    a.id as animal_id,
    a.tag_no,
    COALESCE(COUNT(DISTINCT t.id), 0) as treatment_count,
    COALESCE(COUNT(DISTINCT v.id), 0) as vaccination_count,
    COALESCE(COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END), 0) as visit_count,
    COALESCE(
      SUM(ui.qty * b.purchase_price / NULLIF(b.received_qty, 0)),
      0
    ) as medication_costs,
    COALESCE(COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END) * 10, 0) as visit_costs
  FROM animals a
  LEFT JOIN treatments t ON t.animal_id = a.id
    AND t.reg_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN vaccinations v ON v.animal_id = a.id
    AND v.vaccination_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN animal_visits av ON av.animal_id = a.id
    AND av.visit_datetime >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN usage_items ui ON ui.treatment_id = t.id
  LEFT JOIN batches b ON b.id = ui.batch_id
  GROUP BY a.id, a.tag_no
),
sync_costs AS (
  -- Calculate synchronization medication costs SEPARATELY
  SELECT
    a.id as animal_id,
    COALESCE(
      SUM(ss.dosage * b.purchase_price / NULLIF(b.received_qty, 0)),
      0
    ) as sync_medication_costs
  FROM animals a
  LEFT JOIN animal_synchronizations async ON async.animal_id = a.id
    AND async.start_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN synchronization_steps ss ON ss.synchronization_id = async.id
    AND ss.completed = true
    AND ss.completed_at >= CURRENT_DATE - INTERVAL '90 days'
    AND ss.batch_id IS NOT NULL
    AND ss.dosage IS NOT NULL
  LEFT JOIN batches b ON b.id = ss.batch_id
  GROUP BY a.id
),
combined_costs AS (
  -- Combine treatment and sync costs
  SELECT
    tc.animal_id,
    tc.tag_no,
    tc.treatment_count,
    tc.vaccination_count,
    tc.visit_count,
    tc.medication_costs + COALESCE(sc.sync_medication_costs, 0) as total_medication_costs,
    tc.visit_costs,
    tc.medication_costs + COALESCE(sc.sync_medication_costs, 0) + tc.visit_costs as total_costs
  FROM treatment_costs tc
  LEFT JOIN sync_costs sc ON sc.animal_id = tc.animal_id
)
SELECT
  COALESCE(cc.animal_id, mr.animal_id) as animal_id,
  COALESCE(cc.tag_no, mr.tag_no) as tag_no,
  mr.collar_no,
  mr.days_tracked,
  mr.total_milk_liters,
  mr.avg_daily_milk,
  mr.milk_revenue,
  mr.withdrawal_revenue_loss,
  mr.milk_revenue - mr.withdrawal_revenue_loss as adjusted_milk_revenue,
  COALESCE(cc.treatment_count, 0) as treatment_count,
  COALESCE(cc.vaccination_count, 0) as vaccination_count,
  COALESCE(cc.visit_count, 0) as visit_count,
  COALESCE(cc.total_medication_costs, 0) as medication_costs,
  COALESCE(cc.visit_costs, 0) as visit_costs,
  COALESCE(cc.total_costs, 0) as total_costs,
  (mr.milk_revenue - mr.withdrawal_revenue_loss) - COALESCE(cc.total_costs, 0) as net_profit,
  CASE
    WHEN COALESCE(cc.total_costs, 0) > 0 THEN
      ROUND(((mr.milk_revenue - mr.withdrawal_revenue_loss) - COALESCE(cc.total_costs, 0)) / COALESCE(cc.total_costs, 0) * 100, 1)
    ELSE NULL
  END as roi_percentage,
  CASE
    WHEN (mr.milk_revenue - mr.withdrawal_revenue_loss) > 0 THEN
      ROUND(COALESCE(cc.total_costs, 0) / (mr.milk_revenue - mr.withdrawal_revenue_loss) * 100, 1)
    ELSE NULL
  END as cost_to_revenue_ratio,
  mr.lactation_days,
  mr.current_group,
  mr.current_status,
  mr.is_producing,
  mr.days_in_withdrawal,
  mr.first_date,
  mr.last_date
FROM vw_animal_milk_revenue mr
FULL OUTER JOIN combined_costs cc ON cc.animal_id = mr.animal_id;

-- Update the comment
COMMENT ON VIEW vw_animal_profitability IS 'Comprehensive profitability analysis combining revenue and treatment costs. Includes medications from treatments AND synchronization steps. Fixed cartesian product bug.';

-- Fix GEA milk revenue calculation to use only actual tracked days (not full 90 day period)
CREATE OR REPLACE VIEW vw_animal_milk_revenue AS
WITH milk_production AS (
  SELECT
    gd.animal_id,
    a.tag_no,
    MAX(gd.collar_no) as collar_no,
    COUNT(*) as days_tracked,
    SUM(
      COALESCE(gd.m1_qty, 0) +
      COALESCE(gd.m2_qty, 0) +
      COALESCE(gd.m3_qty, 0) +
      COALESCE(gd.m4_qty, 0) +
      COALESCE(gd.m5_qty, 0)
    ) as total_milk_liters,
    AVG(
      COALESCE(gd.m1_qty, 0) +
      COALESCE(gd.m2_qty, 0) +
      COALESCE(gd.m3_qty, 0) +
      COALESCE(gd.m4_qty, 0) +
      COALESCE(gd.m5_qty, 0)
    ) as avg_daily_milk,
    MIN(gd.snapshot_date) as first_date,
    MAX(gd.snapshot_date) as last_date,
    MAX(gd.lact_days) as lactation_days,
    MAX(gd.grupe) as current_group,
    MAX(gd.statusas) as current_status,
    BOOL_OR(gd.in_milk) as is_producing
  FROM gea_daily gd
  JOIN animals a ON a.id = gd.animal_id
  -- Changed: Use last 14 days instead of 90 days for accurate recent production
  WHERE gd.snapshot_date >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY gd.animal_id, a.tag_no
),
withdrawal_days AS (
  SELECT
    animal_id,
    COUNT(DISTINCT DATE(created_at)) as days_in_withdrawal
  FROM treatments
  WHERE withdrawal_until_milk IS NOT NULL
    AND withdrawal_until_milk >= CURRENT_DATE - INTERVAL '14 days'
    AND created_at >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY animal_id
)
SELECT
  mp.animal_id,
  mp.tag_no,
  mp.collar_no,
  mp.days_tracked,
  mp.total_milk_liters,
  mp.avg_daily_milk,
  mp.total_milk_liters * get_setting('milk_price_per_liter', 0.50) as milk_revenue,
  mp.first_date,
  mp.last_date,
  mp.lactation_days,
  mp.current_group,
  mp.current_status,
  mp.is_producing,
  COALESCE(wd.days_in_withdrawal, 0) as days_in_withdrawal,
  COALESCE(wd.days_in_withdrawal, 0) * get_setting('withdrawal_daily_loss', 15) as withdrawal_revenue_loss
FROM milk_production mp
LEFT JOIN withdrawal_days wd ON wd.animal_id = mp.animal_id;

COMMENT ON VIEW vw_animal_milk_revenue IS 'Calculates milk production and revenue per animal from GEA data over last 14 days (changed from 90 days for accuracy)';
