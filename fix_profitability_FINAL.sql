/*
  # Fix Profitability Medication Cost Calculation - FINAL FIX

  ## Problem
  The previous fix STILL had a cartesian product bug!

  When we JOIN:
  - animal_visits (11 rows)
  - treatments → usage_items (13 items)

  Result: 11 × 13 = 143 rows in the GROUP BY
  SUM(usage_items.cost) counts each cost 11 times!

  Example: €15.05 actual cost → €165.57 reported (11x multiplication)

  ## Root Cause
  You CANNOT have visits and usage_items in the same CTE, even if counting visits with DISTINCT.
  The JOIN creates the cartesian product BEFORE the GROUP BY.

  ## Solution
  Separate into FOUR independent CTEs:
  1. Visit counts CTE (only count visits, no medications)
  2. Treatment medication CTE (only usage_items, no visits)
  3. Planned medication CTE (only planned_medications, no other joins)
  4. Sync medication CTE (only sync_steps, no other joins)

  Then combine all four with LEFT JOINs at the end.
*/

-- Drop and recreate the view with TRULY separate CTEs
CREATE OR REPLACE VIEW vw_animal_profitability AS
WITH visit_counts AS (
  -- Count visits and treatments ONLY (no medications here!)
  SELECT
    a.id as animal_id,
    a.tag_no,
    COALESCE(COUNT(DISTINCT t.id), 0) as treatment_count,
    COALESCE(COUNT(DISTINCT v.id), 0) as vaccination_count,
    COALESCE(COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END), 0) as visit_count,
    COALESCE(COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END) * 10, 0) as visit_costs
  FROM animals a
  LEFT JOIN treatments t ON t.animal_id = a.id
    AND t.reg_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN vaccinations v ON v.animal_id = a.id
    AND v.vaccination_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN animal_visits av ON av.animal_id = a.id
    AND av.visit_datetime >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY a.id, a.tag_no
),
treatment_medication_costs AS (
  -- Calculate medication costs from usage_items ONLY (no visits!)
  SELECT
    a.id as animal_id,
    COALESCE(
      SUM(ui.qty * b.purchase_price / NULLIF(b.received_qty, 0)),
      0
    ) as treatment_medication_costs
  FROM animals a
  LEFT JOIN treatments t ON t.animal_id = a.id
    AND t.reg_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN usage_items ui ON ui.treatment_id = t.id
  LEFT JOIN batches b ON b.id = ui.batch_id
  GROUP BY a.id
),
planned_medication_costs AS (
  -- Calculate costs from planned_medications in visits (separate!)
  SELECT
    a.id as animal_id,
    -- We'll need to calculate this in a subquery to avoid JSON issues
    COALESCE(
      (
        SELECT SUM(
          (pm->>'qty')::numeric * b.purchase_price / NULLIF(b.received_qty, 0)
        )
        FROM animal_visits av
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(av.planned_medications) = 'array'
            THEN av.planned_medications
            ELSE '[]'::jsonb
          END
        ) pm
        LEFT JOIN batches b ON b.id = (pm->>'batch_id')::uuid
        WHERE av.animal_id = a.id
          AND av.visit_datetime >= CURRENT_DATE - INTERVAL '90 days'
          AND pm->>'batch_id' IS NOT NULL
          AND pm->>'qty' IS NOT NULL
      ),
      0
    ) as planned_medication_costs
  FROM animals a
  GROUP BY a.id
),
sync_costs AS (
  -- Calculate synchronization medication costs (separate!)
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
vaccination_costs AS (
  -- Calculate vaccination costs (separate!)
  SELECT
    a.id as animal_id,
    COALESCE(
      SUM(v.dose_amount * b.purchase_price / NULLIF(b.received_qty, 0)),
      0
    ) as vaccination_costs
  FROM animals a
  LEFT JOIN vaccinations v ON v.animal_id = a.id
    AND v.vaccination_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN batches b ON b.id = v.batch_id
  GROUP BY a.id
),
combined_costs AS (
  -- Combine all costs using LEFT JOINs
  SELECT
    vc.animal_id,
    vc.tag_no,
    vc.treatment_count,
    vc.vaccination_count,
    vc.visit_count,
    COALESCE(tmc.treatment_medication_costs, 0) +
    COALESCE(pmc.planned_medication_costs, 0) +
    COALESCE(sc.sync_medication_costs, 0) as total_medication_costs,
    vc.visit_costs,
    COALESCE(vacc.vaccination_costs, 0) as vaccination_costs,
    COALESCE(tmc.treatment_medication_costs, 0) +
    COALESCE(pmc.planned_medication_costs, 0) +
    COALESCE(sc.sync_medication_costs, 0) +
    vc.visit_costs +
    COALESCE(vacc.vaccination_costs, 0) as total_costs
  FROM visit_counts vc
  LEFT JOIN treatment_medication_costs tmc ON tmc.animal_id = vc.animal_id
  LEFT JOIN planned_medication_costs pmc ON pmc.animal_id = vc.animal_id
  LEFT JOIN sync_costs sc ON sc.animal_id = vc.animal_id
  LEFT JOIN vaccination_costs vacc ON vacc.animal_id = vc.animal_id
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
COMMENT ON VIEW vw_animal_profitability IS 'Comprehensive profitability analysis. Fixed ALL cartesian product bugs by separating visits, treatment meds, planned meds, sync meds, and vaccinations into independent CTEs.';
