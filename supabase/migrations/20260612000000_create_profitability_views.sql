-- Create profitability analysis views
-- Created: 2026-06-12
-- These views were missing from the baseline migration

-- 1. First create the milk revenue view (dependency for profitability view)
CREATE OR REPLACE VIEW public.vw_animal_milk_revenue AS
WITH animal_gea_days AS (
  SELECT
    a.id AS animal_id,
    a.tag_no,
    COUNT(DISTINCT a1.import_id) AS days_tracked,
    SUM(COALESCE(a2.avg_milk_prod_weight, 0)) AS total_milk_liters,
    AVG(COALESCE(a2.avg_milk_prod_weight, 0)) AS avg_daily_milk
  FROM public.animals a
  LEFT JOIN public.gea_daily_ataskaita1 a1 
    ON a1.ear_number = a.tag_no
  LEFT JOIN public.gea_daily_ataskaita2 a2 
    ON a2.import_id = a1.import_id 
    AND a2.cow_number = a1.cow_number
    AND a2.avg_milk_prod_weight > 0
  GROUP BY a.id, a.tag_no
)
SELECT
  animal_id,
  tag_no,
  days_tracked,
  total_milk_liters,
  avg_daily_milk,
  ROUND(total_milk_liters * 0.50, 2) AS milk_revenue,
  CASE
    WHEN days_tracked > 0 
    THEN (SELECT created_at FROM public.gea_daily_imports ORDER BY created_at DESC LIMIT 1)::date
    ELSE NULL
  END AS last_date
FROM animal_gea_days;

COMMENT ON VIEW vw_animal_milk_revenue IS 'Milk production and revenue per animal calculated from GEA daily data';

-- 2. Create vw_animal_profitability
CREATE OR REPLACE VIEW public.vw_animal_profitability AS
WITH visit_counts AS (
  SELECT
    a.id AS animal_id,
    a.tag_no,
    COALESCE(COUNT(DISTINCT t.id), 0) AS treatment_count,
    COALESCE(COUNT(DISTINCT vacc.id), 0) AS vaccination_count,
    COALESCE(COUNT(DISTINCT av.id) FILTER (WHERE av.status = 'Baigtas'), 0) AS visit_count
  FROM public.animals a
  LEFT JOIN public.treatments t ON t.animal_id = a.id
  LEFT JOIN public.vaccinations vacc ON vacc.animal_id = a.id
  LEFT JOIN public.animal_visits av ON av.animal_id = a.id
  GROUP BY a.id, a.tag_no
),
treatment_meds AS (
  SELECT
    t.animal_id,
    COALESCE(SUM(ui.qty * (b.purchase_price / NULLIF(b.received_qty, 0))), 0) AS medication_costs
  FROM public.treatments t
  LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
  LEFT JOIN public.batches b ON b.id = ui.batch_id
  GROUP BY t.animal_id
),
vaccination_costs_agg AS (
  SELECT
    vacc.animal_id,
    COALESCE(SUM(vacc.dose_amount * (b.purchase_price / NULLIF(b.received_qty, 0))), 0) AS vaccination_costs
  FROM public.vaccinations vacc
  LEFT JOIN public.batches b ON b.id = vacc.batch_id
  GROUP BY vacc.animal_id
),
sync_meds AS (
  SELECT
    s.animal_id,
    COALESCE(SUM(ss.dosage * (b.purchase_price / NULLIF(b.received_qty, 0))), 0) AS sync_medication_costs
  FROM public.animal_synchronizations s
  LEFT JOIN public.synchronization_steps ss ON ss.synchronization_id = s.id AND ss.completed = true
  LEFT JOIN public.batches b ON b.id = ss.batch_id
  GROUP BY s.animal_id
),
animal_withdrawal AS (
  SELECT
    t.animal_id,
    COALESCE(SUM(
      CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL 
        THEN GREATEST(0, (t.withdrawal_until_milk - t.reg_date) + 1)
        ELSE 0
      END
    ), 0) AS days_in_withdrawal
  FROM public.treatments t
  WHERE t.withdrawal_until_milk IS NOT NULL
  GROUP BY t.animal_id
),
combined_costs AS (
  SELECT
    vc.animal_id,
    vc.tag_no,
    vc.treatment_count,
    vc.vaccination_count,
    vc.visit_count,
    COALESCE(tm.medication_costs, 0) + COALESCE(sm.sync_medication_costs, 0) AS medication_costs,
    0 AS visit_costs,
    COALESCE(vca.vaccination_costs, 0) AS vaccination_costs,
    COALESCE(tm.medication_costs, 0) + COALESCE(sm.sync_medication_costs, 0) + COALESCE(vca.vaccination_costs, 0) AS total_costs,
    COALESCE(aw.days_in_withdrawal, 0) AS days_in_withdrawal
  FROM visit_counts vc
  LEFT JOIN treatment_meds tm ON tm.animal_id = vc.animal_id
  LEFT JOIN vaccination_costs_agg vca ON vca.animal_id = vc.animal_id
  LEFT JOIN sync_meds sm ON sm.animal_id = vc.animal_id
  LEFT JOIN animal_withdrawal aw ON aw.animal_id = vc.animal_id
)
SELECT
  cc.animal_id,
  cc.tag_no,
  COALESCE(lg.collar_no::text, NULL) AS collar_no,
  COALESCE(mr.days_tracked, 0) AS days_tracked,
  COALESCE(mr.total_milk_liters, 0) AS total_milk_liters,
  COALESCE(mr.avg_daily_milk, 0) AS avg_daily_milk,
  COALESCE(mr.milk_revenue, 0) AS milk_revenue,
  COALESCE(mr.milk_revenue * (cc.days_in_withdrawal::numeric / NULLIF(mr.days_tracked, 0)), 0) AS withdrawal_revenue_loss,
  COALESCE(mr.milk_revenue - (mr.milk_revenue * (cc.days_in_withdrawal::numeric / NULLIF(mr.days_tracked, 0))), 0) AS adjusted_milk_revenue,
  cc.treatment_count,
  cc.vaccination_count,
  cc.visit_count,
  cc.medication_costs,
  cc.visit_costs,
  cc.vaccination_costs,
  cc.total_costs,
  COALESCE(mr.milk_revenue, 0) - cc.total_costs AS net_profit,
  CASE
    WHEN cc.total_costs > 0 
    THEN ROUND(((COALESCE(mr.milk_revenue, 0) - cc.total_costs) / cc.total_costs) * 100, 2)
    ELSE NULL
  END AS roi_percentage,
  CASE
    WHEN mr.milk_revenue > 0 
    THEN ROUND((cc.total_costs / mr.milk_revenue) * 100, 2)
    ELSE NULL
  END AS cost_to_revenue_ratio,
  lg.lactation_days,
  lg.group_number::integer AS current_group,
  lg.cow_state AS current_status,
  lg.produce_milk AS is_producing,
  cc.days_in_withdrawal
FROM combined_costs cc
LEFT JOIN public.vw_animal_milk_revenue mr ON mr.animal_id = cc.animal_id
LEFT JOIN public.vw_animal_latest_gea_data lg ON lg.animal_id = cc.animal_id;

COMMENT ON VIEW vw_animal_profitability IS 'Comprehensive profitability analysis per animal including milk revenue, treatment costs, and ROI';

-- 3. Create vw_herd_profitability_summary
CREATE OR REPLACE VIEW public.vw_herd_profitability_summary AS
SELECT
  COUNT(*) AS total_animals,
  COUNT(CASE WHEN net_profit > 0 THEN 1 END) AS profitable_count,
  COUNT(CASE WHEN net_profit <= 0 THEN 1 END) AS unprofitable_count,
  COUNT(CASE WHEN net_profit < -100 THEN 1 END) AS severe_loss_count,
  SUM(total_milk_liters) AS total_herd_milk,
  SUM(milk_revenue) AS total_milk_revenue,
  SUM(total_costs) AS total_treatment_costs,
  SUM(net_profit) AS total_herd_profit,
  ROUND(AVG(net_profit), 2) AS avg_profit_per_animal,
  ROUND(AVG(avg_daily_milk), 2) AS avg_daily_milk_per_animal,
  SUM(days_in_withdrawal) AS total_withdrawal_days,
  SUM(withdrawal_revenue_loss) AS total_withdrawal_loss,
  ROUND(
    CASE
      WHEN SUM(milk_revenue) > 0 
      THEN (SUM(total_costs) / SUM(milk_revenue)) * 100
      ELSE 0
    END, 
    1
  ) AS overall_cost_to_revenue_ratio
FROM public.vw_animal_profitability
WHERE days_tracked > 0;

COMMENT ON VIEW vw_herd_profitability_summary IS 'Aggregate herd-wide profitability metrics and KPIs';

-- 4. Create vw_treatment_roi_analysis
CREATE OR REPLACE VIEW public.vw_treatment_roi_analysis AS
WITH recent_treatments AS (
  SELECT
    t.animal_id,
    a.tag_no,
    COUNT(*) AS treatment_count_last_90_days,
    SUM(
      COALESCE(
        (SELECT SUM(ui.qty * (b.purchase_price / NULLIF(b.received_qty, 0)))
         FROM public.usage_items ui
         LEFT JOIN public.batches b ON b.id = ui.batch_id
         WHERE ui.treatment_id = t.id),
        0
      )
    ) AS total_treatment_cost,
    AVG(
      COALESCE(
        (SELECT SUM(ui.qty * (b.purchase_price / NULLIF(b.received_qty, 0)))
         FROM public.usage_items ui
         LEFT JOIN public.batches b ON b.id = ui.batch_id
         WHERE ui.treatment_id = t.id),
        0
      )
    ) AS avg_treatment_cost,
    MAX(t.reg_date) AS last_treatment_date,
    COUNT(CASE WHEN t.outcome = 'Sveiksta' THEN 1 END) AS successful_treatments,
    COUNT(CASE WHEN t.outcome IS NULL OR t.outcome = 'Gydoma' THEN 1 END) AS ongoing_treatments
  FROM public.treatments t
  LEFT JOIN public.animals a ON a.id = t.animal_id
  WHERE t.reg_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY t.animal_id, a.tag_no
)
SELECT
  p.animal_id,
  p.tag_no,
  p.collar_no,
  p.avg_daily_milk,
  p.net_profit,
  p.total_costs AS current_total_costs,
  COALESCE(rt.treatment_count_last_90_days, 0) AS treatment_count_last_90_days,
  COALESCE(rt.total_treatment_cost, 0) AS total_treatment_cost,
  COALESCE(rt.avg_treatment_cost, 0) AS avg_treatment_cost,
  rt.last_treatment_date,
  COALESCE(rt.successful_treatments, 0) AS successful_treatments,
  COALESCE(rt.ongoing_treatments, 0) AS ongoing_treatments,
  CASE
    WHEN rt.treatment_count_last_90_days > 0
    THEN ROUND((rt.successful_treatments::numeric / rt.treatment_count_last_90_days) * 100, 1)
    ELSE NULL
  END AS success_rate_percentage,
  CASE
    WHEN p.avg_daily_milk > 0 AND rt.avg_treatment_cost > 0
    THEN ROUND(rt.avg_treatment_cost / (p.avg_daily_milk * 0.50), 1)
    ELSE NULL
  END AS days_to_payback_avg_treatment,
  CASE
    WHEN rt.treatment_count_last_90_days >= 4 AND p.net_profit < -200 THEN 'cull_recommended'
    WHEN rt.treatment_count_last_90_days >= 3 AND p.net_profit < -100 THEN 'chronic_case'
    WHEN p.net_profit < 0 THEN 'at_risk'
    WHEN p.net_profit < 50 THEN 'monitor'
    WHEN p.net_profit > 50 THEN 'profitable'
    ELSE 'monitor'
  END AS recommendation,
  p.current_status,
  p.is_producing
FROM public.vw_animal_profitability p
LEFT JOIN recent_treatments rt ON rt.animal_id = p.animal_id;

COMMENT ON VIEW vw_treatment_roi_analysis IS 'Treatment ROI analysis with decision recommendations';

-- 5. Grant permissions
GRANT SELECT ON public.vw_animal_milk_revenue TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_animal_profitability TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_herd_profitability_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_treatment_roi_analysis TO anon, authenticated, service_role;

-- 6. Insert default milk price setting if not exists
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description)
VALUES (
  'milk_price_per_liter',
  '0.50',
  'number',
  'Pieno kaina už litrą (EUR)'
)
ON CONFLICT (setting_key) DO NOTHING;
