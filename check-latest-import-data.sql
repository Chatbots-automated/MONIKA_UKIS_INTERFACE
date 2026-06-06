-- Check what's actually in the latest import for collar 189

-- 1. Get latest import ID
SELECT 
  'Latest Import' as info,
  id as import_id,
  created_at,
  count_ataskaita1,
  count_ataskaita2,
  count_ataskaita3
FROM gea_daily_imports
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check collar 189 in ataskaita1 (latest import)
WITH latest AS (
  SELECT id FROM gea_daily_imports ORDER BY created_at DESC LIMIT 1
)
SELECT 
  'Ataskaita1 (latest)' as source,
  a1.*
FROM gea_daily_ataskaita1 a1
WHERE a1.import_id = (SELECT id FROM latest)
  AND a1.cow_number = '189';

-- 3. Check collar 189 in ataskaita2 (latest import)
WITH latest AS (
  SELECT id FROM gea_daily_imports ORDER BY created_at DESC LIMIT 1
)
SELECT 
  'Ataskaita2 (latest)' as source,
  a2.cow_number,
  a2.last_milking_date,
  a2.last_milking_time,
  a2.last_milking_weight,
  a2.avg_milk_prod_weight,
  a2.milkings
FROM gea_daily_ataskaita2 a2
WHERE a2.import_id = (SELECT id FROM latest)
  AND a2.cow_number = '189';

-- 4. Check collar 189 in ataskaita3 (latest import)
WITH latest AS (
  SELECT id FROM gea_daily_imports ORDER BY created_at DESC LIMIT 1
)
SELECT 
  'Ataskaita3 (latest)' as source,
  a3.*
FROM gea_daily_ataskaita3 a3
WHERE a3.import_id = (SELECT id FROM latest)
  AND a3.cow_number = '189';

-- 5. Check how many imports exist for collar 189 across all time
SELECT 
  i.created_at,
  a2.cow_number,
  a2.last_milking_date,
  a2.avg_milk_prod_weight,
  CASE 
    WHEN i.created_at = (SELECT MAX(created_at) FROM gea_daily_imports) THEN '✅ LATEST'
    ELSE '❌ OLD'
  END as status
FROM gea_daily_ataskaita2 a2
JOIN gea_daily_imports i ON i.id = a2.import_id
WHERE a2.cow_number = '189'
ORDER BY i.created_at DESC
LIMIT 5;

-- 6. Check gea_daily_cows_joined for collar 189 (all imports)
SELECT 
  import_created_at,
  cow_number,
  ear_number,
  last_milking_date,
  last_milking_time,
  avg_milk_prod_weight,
  CASE 
    WHEN import_created_at = (SELECT MAX(created_at) FROM gea_daily_imports) THEN '✅ LATEST'
    ELSE '❌ OLD'
  END as status
FROM gea_daily_cows_joined
WHERE cow_number = '189'
ORDER BY import_created_at DESC
LIMIT 5;

-- 7. Check the vw_animal_latest_gea_data view for this collar
SELECT 
  'vw_animal_latest_gea_data' as source,
  animal_ear_tag,
  collar_no,
  gea_import_date,
  last_milking_date,
  avg_milk_prod_weight
FROM vw_animal_latest_gea_data
WHERE collar_no = '189';
