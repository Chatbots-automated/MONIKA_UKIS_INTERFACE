-- Test script to validate the collar number fix
-- Run this AFTER applying the migration 20260606000001_fix_collar_latest_data.sql

-- 1. Check if the new views exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'vw_animal_latest_collar' THEN '✅ Collar view exists'
    WHEN table_name = 'vw_animal_latest_gea_data' THEN '✅ Full GEA data view exists'
  END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('vw_animal_latest_collar', 'vw_animal_latest_gea_data');

-- 2. Show the latest import info
SELECT 
  'Latest Import' as info,
  id,
  created_at as import_date,
  count_ataskaita1 as total_cows
FROM gea_daily_imports
ORDER BY created_at DESC
LIMIT 1;

-- 3. Test collar 189 specifically (from the user's example)
-- Show which animal currently has collar 189 in the LATEST import
WITH latest_import AS (
  SELECT id, created_at
  FROM gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  '🔍 Collar 189 in Latest Import' as test,
  a1.cow_number as collar,
  a1.ear_number,
  a1.cow_state,
  li.created_at as import_date,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM animals a WHERE a.tag_no = a1.ear_number
    ) THEN '✅ Animal exists in our database'
    ELSE '❌ Animal NOT in our database (sold?)'
  END as in_our_db
FROM gea_daily_ataskaita1 a1
CROSS JOIN latest_import li
WHERE a1.import_id = li.id
  AND a1.cow_number = '189';

-- 4. Show what the new view returns for collar 189
SELECT 
  '🔍 vw_animal_latest_collar for collar 189' as test,
  v.animal_id,
  a.tag_no as ear_tag,
  v.collar_no
FROM vw_animal_latest_collar v
JOIN animals a ON a.id = v.animal_id
WHERE v.collar_no = 189;

-- 5. Test the complete GEA data view
SELECT 
  '📊 Complete GEA Data Sample' as test,
  v.animal_ear_tag,
  v.collar_no,
  v.group_number,
  v.cow_state,
  v.gea_import_date,
  v.lactation_days
FROM vw_animal_latest_gea_data v
WHERE v.collar_no IS NOT NULL
ORDER BY v.collar_no::integer
LIMIT 10;

-- 6. Verify no stale data: Check if any animal has collar data from OLD imports
-- This should return 0 rows if the fix is working
WITH latest_import AS (
  SELECT id, created_at
  FROM gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
),
collar_data_per_import AS (
  SELECT 
    a.id as animal_id,
    a.tag_no,
    i.created_at as import_date,
    a1.cow_number,
    CASE 
      WHEN i.id = (SELECT id FROM latest_import) THEN 'LATEST'
      ELSE 'OLD'
    END as import_type
  FROM animals a
  JOIN gea_daily_ataskaita1 a1 ON a1.ear_number = a.tag_no
  JOIN gea_daily_imports i ON i.id = a1.import_id
  WHERE a1.cow_number IS NOT NULL
)
SELECT 
  '⚠️ Stale Collar Assignments (should be 0)' as warning,
  COUNT(*) as stale_count
FROM collar_data_per_import
WHERE import_type = 'OLD'
  AND animal_id IN (
    SELECT animal_id FROM vw_animal_latest_collar
  );

-- 7. Show collar reassignments (collars that have been used by multiple animals)
WITH collar_history AS (
  SELECT 
    a1.cow_number,
    a1.ear_number,
    i.created_at,
    ROW_NUMBER() OVER (PARTITION BY a1.cow_number ORDER BY i.created_at DESC) as recency
  FROM gea_daily_ataskaita1 a1
  JOIN gea_daily_imports i ON i.id = a1.import_id
  WHERE a1.cow_number ~ '^[0-9]+$'
)
SELECT 
  '🔄 Reassigned Collars Example' as info,
  cow_number as collar,
  ear_number,
  created_at as import_date,
  CASE 
    WHEN recency = 1 THEN '✅ CURRENT'
    ELSE '❌ OLD (History)'
  END as status
FROM collar_history
WHERE cow_number IN (
  SELECT cow_number
  FROM collar_history
  WHERE cow_number IS NOT NULL
  GROUP BY cow_number
  HAVING COUNT(DISTINCT ear_number) > 1
  LIMIT 3
)
ORDER BY cow_number, created_at DESC;

-- 8. Summary statistics
SELECT 
  '📈 Summary' as info,
  (SELECT COUNT(*) FROM animals) as total_animals,
  (SELECT COUNT(*) FROM vw_animal_latest_collar) as animals_with_collar,
  (SELECT COUNT(*) FROM vw_animal_latest_gea_data WHERE collar_no IS NOT NULL) as animals_with_gea_data,
  (SELECT created_at FROM gea_daily_imports ORDER BY created_at DESC LIMIT 1) as latest_import_date,
  (SELECT COUNT(*) FROM gea_daily_imports) as total_imports;
