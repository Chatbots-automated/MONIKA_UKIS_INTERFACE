-- Remove 10 EUR base visit costs from analytics
-- Created: 2026-06-12
-- Visit costs should be 0, only actual medicine/product costs should be counted

-- Drop existing view to allow column type changes
DROP VIEW IF EXISTS public.vw_animal_cost_analytics;

-- Recreate vw_animal_cost_analytics with visit_cost = 0 and proper vaccine cost calculation
CREATE VIEW public.vw_animal_cost_analytics AS
WITH treatment_costs AS (
  SELECT 
    t.animal_id,
    COUNT(DISTINCT t.id) AS treatment_count,
    (
      COALESCE(SUM(ui.qty * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0)), 0) +
      COALESCE(SUM(tc.total_dose * COALESCE(bc.purchase_price / NULLIF(bc.received_qty, 0), 0)), 0)
    ) AS medicine_cost
  FROM public.treatments t
  LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
  LEFT JOIN public.batches b ON b.id = ui.batch_id
  LEFT JOIN public.treatment_courses tc ON tc.treatment_id = t.id
  LEFT JOIN public.batches bc ON bc.id = tc.batch_id
  WHERE t.animal_id IS NOT NULL
  GROUP BY t.animal_id
),
vaccination_costs AS (
  SELECT 
    v.animal_id,
    COUNT(v.id) AS vaccination_count,
    COALESCE(SUM(v.dose_amount * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0)), 0) AS vaccine_cost
  FROM public.vaccinations v
  LEFT JOIN public.batches b ON b.id = v.batch_id
  WHERE v.animal_id IS NOT NULL
  GROUP BY v.animal_id
),
visit_costs AS (
  SELECT 
    av.animal_id,
    COUNT(av.id) AS visit_count,
    0 AS visit_cost  -- Changed from (COUNT(av.id) * 10) to 0
  FROM public.animal_visits av
  WHERE av.animal_id IS NOT NULL
  GROUP BY av.animal_id
)
SELECT 
  a.id AS animal_id,
  a.tag_no,
  COALESCE(tc.treatment_count, 0) AS treatment_count,
  COALESCE(tc.medicine_cost, 0) AS medicine_cost,
  COALESCE(vc.vaccination_count, 0) AS vaccination_count,
  COALESCE(vc.vaccine_cost, 0) AS vaccine_cost,
  COALESCE(vsc.visit_count, 0) AS visit_count,
  COALESCE(vsc.visit_cost, 0) AS visit_cost,
  (
    COALESCE(tc.medicine_cost, 0) + 
    COALESCE(vc.vaccine_cost, 0) + 
    COALESCE(vsc.visit_cost, 0)
  ) AS total_cost
FROM public.animals a
LEFT JOIN treatment_costs tc ON tc.animal_id = a.id
LEFT JOIN vaccination_costs vc ON vc.animal_id = a.id
LEFT JOIN visit_costs vsc ON vsc.animal_id = a.id;

COMMENT ON VIEW public.vw_animal_cost_analytics IS 'Cost analytics per animal - medicine, vaccine, and visit counts. Visit costs set to 0 (only actual product costs counted).';

-- Grant permissions
GRANT SELECT ON public.vw_animal_cost_analytics TO anon, authenticated, service_role;
