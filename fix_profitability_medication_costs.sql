/*
  # Fix Profitability Medication Cost Calculation

  ## Problem
  The `vw_animal_profitability` view only counts medication costs from treatments
  (via usage_items.treatment_id), but misses medications from visits (via usage_items.visit_id).

  This causes synchronization visit medications and other visit-based medications
  to not be included in profitability calculations.

  ## Solution
  Update the view to include BOTH:
  - Medications linked to treatments (usage_items.treatment_id)
  - Medications linked to visits (usage_items.visit_id)

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
    -- Calculate medication costs from BOTH treatments AND visits
    COALESCE(
      -- Costs from treatment medications
      SUM(CASE
        WHEN ui.treatment_id IS NOT NULL THEN
          ui.qty * b.purchase_price / NULLIF(b.received_qty, 0)
        ELSE 0
      END) +
      -- Costs from visit medications (only for completed visits)
      SUM(CASE
        WHEN ui.visit_id IS NOT NULL AND av_med.status = 'Baigtas' THEN
          ui.qty * b.purchase_price / NULLIF(b.received_qty, 0)
        ELSE 0
      END),
      0
    ) as medication_costs,
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
  -- Join usage_items (can be linked to either treatment_id OR visit_id)
  LEFT JOIN usage_items ui ON (ui.treatment_id = t.id OR ui.visit_id = av.id)
  -- Join another reference to animal_visits for visit medications status check
  LEFT JOIN animal_visits av_med ON av_med.id = ui.visit_id
  -- Join batches for cost calculation
  LEFT JOIN batches b ON b.id = ui.batch_id
  GROUP BY a.id, a.tag_no
),
costs_with_total AS (
  SELECT
    *,
    medication_costs + visit_costs as total_costs
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
COMMENT ON VIEW vw_animal_profitability IS 'Comprehensive profitability analysis combining revenue and treatment costs. Includes medications from both treatments AND visits.';
