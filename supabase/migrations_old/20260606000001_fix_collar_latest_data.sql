-- Fix collar number and GEA data to always show ONLY the latest import
-- This ensures that when collar 189 is reassigned from Cow X to Cow Y,
-- we only show collar 189 for Cow Y (not the historical assignment to Cow X)

BEGIN;

-- Drop the old view
DROP VIEW IF EXISTS public.vw_animal_latest_collar;

-- Create the fixed view that ONLY uses data from the absolute latest import
-- Not the latest import per animal, but the latest import overall
CREATE OR REPLACE VIEW public.vw_animal_latest_collar AS
WITH latest_import AS (
  -- Get the single most recent import
  SELECT id, created_at
  FROM public.gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  a.id as animal_id,
  g.cow_number::integer as collar_no
FROM public.animals a
INNER JOIN latest_import li ON true
INNER JOIN public.gea_daily_ataskaita1 g 
  ON g.import_id = li.id 
  AND g.ear_number = a.tag_no
WHERE g.cow_number IS NOT NULL
  AND g.cow_number ~ '^[0-9]+$';  -- Only numeric collar numbers

-- Grant permissions
GRANT SELECT ON public.vw_animal_latest_collar TO authenticated;
GRANT SELECT ON public.vw_animal_latest_collar TO anon;
GRANT SELECT ON public.vw_animal_latest_collar TO service_role;

COMMENT ON VIEW public.vw_animal_latest_collar IS 
'Shows collar numbers ONLY from the absolute latest GEA import. 
If a collar is reassigned from one animal to another, only the current assignment is shown.
Animals that do not appear in the latest import will have no collar number.';

-- Also create a helper view to get ALL latest GEA data (not just collar)
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
  li.created_at as gea_import_date,
  
  -- From ataskaita1
  g1.cow_number as collar_no,
  g1.cow_state,
  g1.group_number,
  g1.pregnant_since,
  g1.lactation_days,
  g1.inseminated_at,
  g1.pregnant_days,
  g1.next_pregnancy_date,
  g1.days_until_waiting_pregnancy,
  
  -- From ataskaita2
  g2.genetic_worth,
  g2.blood_line,
  g2.avg_milk_prod_weight,
  g2.produce_milk,
  g2.last_milking_date,
  g2.last_milking_time,
  g2.last_milking_weight,
  
  -- From ataskaita3
  g3.insemination_count,
  g3.bull_1,
  g3.bull_2,
  g3.bull_3,
  g3.lactation_number

FROM public.animals a
CROSS JOIN latest_import li
LEFT JOIN public.gea_daily_ataskaita1 g1 
  ON g1.import_id = li.id AND g1.ear_number = a.tag_no
LEFT JOIN public.gea_daily_ataskaita2 g2 
  ON g2.import_id = li.id AND g2.cow_number = g1.cow_number
LEFT JOIN public.gea_daily_ataskaita3 g3 
  ON g3.import_id = li.id AND g3.cow_number = g1.cow_number;

-- Grant permissions
GRANT SELECT ON public.vw_animal_latest_gea_data TO authenticated;
GRANT SELECT ON public.vw_animal_latest_gea_data TO anon;
GRANT SELECT ON public.vw_animal_latest_gea_data TO service_role;

COMMENT ON VIEW public.vw_animal_latest_gea_data IS 
'Complete GEA data for all animals from the absolute latest import.
Shows collar numbers, pregnancy data, milking data, etc.
Only includes data from the most recent GEA import.
Importuota date can be found in gea_import_date column.';

-- Create an index on ataskaita1 for faster queries
CREATE INDEX IF NOT EXISTS idx_gea_a1_import_ear 
  ON public.gea_daily_ataskaita1(import_id, ear_number);

COMMIT;
