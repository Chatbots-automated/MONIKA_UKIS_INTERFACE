-- =====================================================================
-- FIX FOR MEDICINE COST BUG
-- =====================================================================
-- Problem: Medicine costs from treatment_courses are NOT included
-- Solution: Update views to include both usage_items AND treatment_courses
-- =====================================================================

-- Drop and recreate the view with course support
DROP VIEW IF EXISTS public.vw_animal_cost_analytics;

CREATE OR REPLACE VIEW public.vw_animal_cost_analytics AS
WITH treatment_costs AS (
  SELECT
    t.animal_id,
    COUNT(DISTINCT t.id) as treatment_count,
    -- Medicine cost from immediate usage (usage_items)
    COALESCE(SUM(ui.qty * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0)), 0) +
    -- Medicine cost from courses (treatment_courses) -- THIS IS THE FIX!
    COALESCE(SUM(tc.total_dose * COALESCE(bc.purchase_price / NULLIF(bc.received_qty, 0), 0)), 0) as medicine_cost
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
    COUNT(v.id) as vaccination_count,
    0 as vaccine_cost
  FROM public.vaccinations v
  WHERE v.animal_id IS NOT NULL
  GROUP BY v.animal_id
),
visit_costs AS (
  SELECT
    av.animal_id,
    COUNT(av.id) as visit_count,
    COUNT(av.id) * 10 as visit_cost
  FROM public.animal_visits av
  WHERE av.animal_id IS NOT NULL
  GROUP BY av.animal_id
)
SELECT
  a.id as animal_id,
  a.tag_no,
  COALESCE(tc.treatment_count, 0) as treatment_count,
  COALESCE(tc.medicine_cost, 0) as medicine_cost,
  COALESCE(vc.vaccination_count, 0) as vaccination_count,
  COALESCE(vc.vaccine_cost, 0) as vaccine_cost,
  COALESCE(vsc.visit_count, 0) as visit_count,
  COALESCE(vsc.visit_cost, 0) as visit_cost,
  COALESCE(tc.medicine_cost, 0) + COALESCE(vc.vaccine_cost, 0) + COALESCE(vsc.visit_cost, 0) as total_cost
FROM public.animals a
LEFT JOIN treatment_costs tc ON tc.animal_id = a.id
LEFT JOIN vaccination_costs vc ON vc.animal_id = a.id
LEFT JOIN visit_costs vsc ON vsc.animal_id = a.id;

-- Also fix the product usage view to include course products
DROP VIEW IF EXISTS public.vw_animal_product_usage;

CREATE OR REPLACE VIEW public.vw_animal_product_usage AS
WITH treatment_products AS (
  -- Products from immediate usage (usage_items)
  SELECT
    t.animal_id,
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.primary_pack_unit as unit,
    COUNT(ui.id) as usage_count,
    SUM(ui.qty) as total_quantity,
    SUM(ui.qty * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0)) as total_cost
  FROM public.treatments t
  JOIN public.usage_items ui ON ui.treatment_id = t.id
  JOIN public.products p ON p.id = ui.product_id
  LEFT JOIN public.batches b ON b.id = ui.batch_id
  WHERE t.animal_id IS NOT NULL
  GROUP BY t.animal_id, p.id, p.name, p.category, p.primary_pack_unit

  UNION ALL

  -- Products from courses (treatment_courses) -- THIS IS THE FIX!
  SELECT
    t.animal_id,
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.primary_pack_unit as unit,
    COUNT(tc.id) as usage_count,
    SUM(tc.total_dose) as total_quantity,
    SUM(tc.total_dose * COALESCE(bc.purchase_price / NULLIF(bc.received_qty, 0), 0)) as total_cost
  FROM public.treatments t
  JOIN public.treatment_courses tc ON tc.treatment_id = t.id
  JOIN public.products p ON p.id = tc.product_id
  LEFT JOIN public.batches bc ON bc.id = tc.batch_id
  WHERE t.animal_id IS NOT NULL
  GROUP BY t.animal_id, p.id, p.name, p.category, p.primary_pack_unit
),
combined_products AS (
  SELECT
    animal_id,
    product_id,
    product_name,
    category,
    unit,
    SUM(usage_count) as usage_count,
    SUM(total_quantity) as total_quantity,
    SUM(total_cost) as total_cost
  FROM treatment_products
  GROUP BY animal_id, product_id, product_name, category, unit
)
SELECT
  animal_id,
  product_id,
  product_name,
  category,
  unit,
  usage_count,
  total_quantity,
  total_cost,
  ROW_NUMBER() OVER (PARTITION BY animal_id ORDER BY usage_count DESC) as usage_rank
FROM combined_products;

-- =====================================================================
-- DONE! Now refresh the animal detail page to see correct costs.
-- =====================================================================
