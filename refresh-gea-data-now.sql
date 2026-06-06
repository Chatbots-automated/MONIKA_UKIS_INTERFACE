-- Run this RIGHT NOW to refresh the materialized view and see the latest data!

-- 1. Check current materialized view data for collar 189 (BEFORE refresh)
SELECT 
  'BEFORE REFRESH - Collar 189' as status,
  animal_id,
  tag_no,
  collar_no,
  import_created_at,
  avg_daily_milk,
  current_status
FROM mv_animal_latest_gea
WHERE collar_no = '189';

-- 2. REFRESH the materialized view (this makes it show latest data)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_animal_latest_gea;

-- 3. Check materialized view data for collar 189 (AFTER refresh)
SELECT 
  'AFTER REFRESH - Collar 189' as status,
  animal_id,
  tag_no,
  collar_no,
  import_created_at,
  avg_daily_milk,
  current_status
FROM mv_animal_latest_gea
WHERE collar_no = '189';

-- 4. Compare with actual latest import data
WITH latest_import AS (
  SELECT id, created_at 
  FROM gea_daily_imports 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'ACTUAL LATEST DATA - Collar 189' as status,
  a1.cow_number as collar_no,
  a1.ear_number,
  a2.last_milking_date,
  a2.avg_milk_prod_weight,
  li.created_at as import_date
FROM gea_daily_ataskaita1 a1
CROSS JOIN latest_import li
LEFT JOIN gea_daily_ataskaita2 a2 
  ON a2.import_id = li.id AND a2.cow_number = a1.cow_number
WHERE a1.import_id = li.id
  AND a1.cow_number = '189';

-- 5. Show summary of what was refreshed
SELECT 
  'SUMMARY' as info,
  COUNT(*) as total_animals,
  COUNT(CASE WHEN collar_no IS NOT NULL THEN 1 END) as animals_with_collar,
  MAX(import_created_at) as latest_import_in_view
FROM mv_animal_latest_gea;
