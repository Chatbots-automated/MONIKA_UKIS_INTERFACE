-- ============================================
-- Fix GEA View to Handle Missing Report 1 Data
-- Allow matching by collar number stored in animals table
-- ============================================

BEGIN;

-- Add collar_no column to animals table to store the GEA collar number
ALTER TABLE public.animals 
  ADD COLUMN IF NOT EXISTS collar_no integer NULL;

COMMENT ON COLUMN public.animals.collar_no IS 
'GEA collar number for this animal. Used to match with GEA reports when ear tag is not available.';

CREATE INDEX IF NOT EXISTS idx_animals_collar_no ON public.animals(collar_no)
  WHERE collar_no IS NOT NULL;

-- Update the view to handle animals that may not be in Report 1
-- but still have data in Reports 2 or 3
DROP VIEW IF EXISTS public.vw_animal_latest_gea_data;

CREATE OR REPLACE VIEW public.vw_animal_latest_gea_data AS
WITH latest_import AS (
  SELECT id, created_at
  FROM public.gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  a.id as animal_id,
  a.tag_no as animal_ear_tag,
  a.collar_no as animal_collar_no,
  li.created_at as gea_import_date,
  
  -- From ataskaita1 (pregnancy/reproduction)
  COALESCE(g1.cow_number, g2.cow_number, g3.cow_number) as collar_no,
  g1.cow_state,
  g1.group_number,
  g1.pregnant_since,
  g1.lactation_days,
  g1.inseminated_at,
  g1.pregnant_days,
  g1.next_pregnancy_date,
  g1.days_until_waiting_pregnancy,
  
  -- From ataskaita2 (milk production)
  g2.genetic_worth,
  g2.blood_line,
  g2.avg_milk_prod_weight,
  g2.produce_milk,
  g2.last_milking_date,
  g2.last_milking_time,
  g2.last_milking_weight,
  g2.milkings,
  
  -- From ataskaita3 (insemination/lactation)
  g3.teat_missing_right_back,
  g3.teat_missing_back_left,
  g3.teat_missing_front_left,
  g3.teat_missing_front_right,
  g3.insemination_count,
  g3.bull_1,
  g3.bull_2,
  g3.bull_3,
  g3.lactation_number

FROM public.animals a
CROSS JOIN latest_import li
-- Match by ear tag in Report 1
LEFT JOIN public.gea_daily_ataskaita1 g1 
  ON g1.import_id = li.id 
  AND (g1.ear_number = a.tag_no OR g1.cow_number::integer = a.collar_no)
-- Match Report 2 by collar number (either from Report 1 or directly from animals.collar_no)
LEFT JOIN public.gea_daily_ataskaita2 g2 
  ON g2.import_id = li.id 
  AND (g2.cow_number = g1.cow_number OR g2.cow_number::integer = a.collar_no)
-- Match Report 3 by collar number (either from Report 1 or directly from animals.collar_no)
LEFT JOIN public.gea_daily_ataskaita3 g3 
  ON g3.import_id = li.id 
  AND (g3.cow_number = g1.cow_number OR g3.cow_number::integer = a.collar_no);

COMMENT ON VIEW public.vw_animal_latest_gea_data IS 
'Complete GEA data for all animals from the absolute latest import.
Matches animals by ear tag AND/OR collar number to ensure all available GEA data is shown.';

-- Grant permissions
GRANT SELECT ON public.vw_animal_latest_gea_data TO authenticated, service_role, anon;

COMMIT;
