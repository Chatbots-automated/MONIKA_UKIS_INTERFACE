/*
  # Fix Profitability Medication Cost Calculation

  ## Problem
  The `vw_animal_profitability` view only counts medication costs from treatments
  (via usage_items.treatment_id), but misses medications from:
  1. Synchronization steps (stored in synchronization_steps table)
  2. The original view was looking for non-existent usage_items.visit_id column

  ## Solution
  Update the view to include ALL medication costs from:
  - Treatment medications (usage_items linked to treatments)
  - Synchronization medications (synchronization_steps with completed=true)

  Also ensure we only count COMPLETED visits, not planned ones.
*/

-- Drop and recreate the view with fixed medication cost calculation
CREATE OR REPLACE VIEW vw_animal_profitability AS
WITH animal_costs AS (
  SELECT
    a.id as animal_id,
    a.tag_no,
    -- Count treatments
    COALESCE(COUNT(DISTINCT t.id), 0) as treatment_count,
    -- Count vaccinations
    COALESCE(COUNT(DISTINCT v.id), 0) as vaccination_count,
    -- Count only COMPLETED visits (not planned ones)
    COALESCE(COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END), 0) as visit_count,
    -- Calculate medication costs from treatments (usage_items)
    COALESCE(
      SUM(CASE
        WHEN ui.treatment_id IS NOT NULL THEN
          ui.qty * b1.purchase_price / NULLIF(b1.received_qty, 0)
        ELSE 0
      END),
      0
    ) as treatment_medication_costs,
    -- Calculate medication costs from synchronization steps
    COALESCE(
      SUM(CASE
        WHEN ss.completed = true AND ss.batch_id IS NOT NULL AND ss.dosage IS NOT NULL THEN
          ss.dosage * b2.purchase_price / NULLIF(b2.received_qty, 0)
        ELSE 0
      END),
      0
    ) as sync_medication_costs,
    -- Visit costs: only count completed visits
    COALESCE(COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END) * 10, 0) as visit_costs
  FROM animals a
  -- Join treatments
  LEFT JOIN treatments t ON t.animal_id = a.id
    AND t.reg_date >= CURRENT_DATE - INTERVAL '90 days'
  -- Join vaccinations
  LEFT JOIN vaccinations v ON v.animal_id = a.id
    AND v.vaccination_date >= CURRENT_DATE - INTERVAL '90 days'
  -- Join visits
  LEFT JOIN animal_visits av ON av.animal_id = a.id
    AND av.visit_datetime >= CURRENT_DATE - INTERVAL '90 days'
  -- Join usage_items for treatment medications
  LEFT JOIN usage_items ui ON ui.treatment_id = t.id
  LEFT JOIN batches b1 ON b1.id = ui.batch_id
  -- Join synchronization data for sync medications
  LEFT JOIN animal_synchronizations async ON async.animal_id = a.id
    AND async.start_date >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN synchronization_steps ss ON ss.synchronization_id = async.id
    AND ss.completed_at >= CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN batches b2 ON b2.id = ss.batch_id
  GROUP BY a.id, a.tag_no
),
costs_with_total AS (
  SELECT
    *,
    treatment_medication_costs + sync_medication_costs as medication_costs,
    treatment_medication_costs + sync_medication_costs + visit_costs as total_costs
  FROM animal_costs
)
SELECT
  COALESCE(ac.animal_id, mr.animal_id) as animal_id,
  COALESCE(ac.tag_no, mr.tag_no) as tag_no,
  mr.collar_no,
  mr.days_tracked,
  mr.total_milk_liters,
  mr.avg_daily_milk,
  mr.milk_revenue,
  mr.withdrawal_revenue_loss,
  mr.milk_revenue - mr.withdrawal_revenue_loss as adjusted_milk_revenue,
  COALESCE(ac.treatment_count, 0) as treatment_count,
  COALESCE(ac.vaccination_count, 0) as vaccination_count,
  COALESCE(ac.visit_count, 0) as visit_count,
  COALESCE(ac.medication_costs, 0) as medication_costs,
  COALESCE(ac.visit_costs, 0) as visit_costs,
  COALESCE(ac.total_costs, 0) as total_costs,
  (mr.milk_revenue - mr.withdrawal_revenue_loss) - COALESCE(ac.total_costs, 0) as net_profit,
  CASE
    WHEN COALESCE(ac.total_costs, 0) > 0 THEN
      ROUND(((mr.milk_revenue - mr.withdrawal_revenue_loss) - COALESCE(ac.total_costs, 0)) / COALESCE(ac.total_costs, 0) * 100, 1)
    ELSE NULL
  END as roi_percentage,
  CASE
    WHEN (mr.milk_revenue - mr.withdrawal_revenue_loss) > 0 THEN
      ROUND(COALESCE(ac.total_costs, 0) / (mr.milk_revenue - mr.withdrawal_revenue_loss) * 100, 1)
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
FULL OUTER JOIN costs_with_total ac ON ac.animal_id = mr.animal_id;

-- Update the comment
COMMENT ON VIEW vw_animal_profitability IS 'Comprehensive profitability analysis combining revenue and treatment costs. Includes medications from treatments AND synchronization steps.';
