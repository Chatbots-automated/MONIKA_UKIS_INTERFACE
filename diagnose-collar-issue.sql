-- Diagnose the collar number reassignment issue
-- This shows how collar numbers can be reassigned between different animals

-- 1. Get the latest import
WITH latest_import AS (
  SELECT id, created_at
  FROM gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
),

-- 2. Show example of collar 189 history across multiple imports
collar_189_history AS (
  SELECT 
    i.created_at as import_date,
    a1.cow_number as collar_number,
    a1.ear_number,
    a1.cow_state,
    ROW_NUMBER() OVER (ORDER BY i.created_at DESC) as recency_rank
  FROM gea_daily_ataskaita1 a1
  JOIN gea_daily_imports i ON i.id = a1.import_id
  WHERE a1.cow_number = '189'
  ORDER BY i.created_at DESC
  LIMIT 10
)

-- Show the history
SELECT 
  import_date,
  collar_number,
  ear_number,
  cow_state,
  CASE 
    WHEN recency_rank = 1 THEN '✅ CURRENT (Latest)'
    ELSE '❌ OLD (History)'
  END as status
FROM collar_189_history;

-- 3. Show how many collar numbers have been reassigned
WITH collar_ear_combinations AS (
  SELECT 
    cow_number,
    ear_number,
    COUNT(DISTINCT import_id) as import_count
  FROM gea_daily_ataskaita1
  WHERE cow_number IS NOT NULL 
    AND ear_number IS NOT NULL
    AND cow_number ~ '^[0-9]+$'  -- Only numeric collars
  GROUP BY cow_number, ear_number
),
collar_reassignments AS (
  SELECT 
    cow_number,
    COUNT(DISTINCT ear_number) as different_ear_numbers
  FROM collar_ear_combinations
  GROUP BY cow_number
  HAVING COUNT(DISTINCT ear_number) > 1
)

SELECT 
  COUNT(*) as total_reassigned_collars,
  MIN(different_ear_numbers) as min_ears_per_collar,
  MAX(different_ear_numbers) as max_ears_per_collar,
  AVG(different_ear_numbers) as avg_ears_per_collar
FROM collar_reassignments;

-- 4. Show examples of reassigned collars
SELECT 
  a1.cow_number as collar,
  a1.ear_number,
  i.created_at as import_date,
  a1.cow_state
FROM gea_daily_ataskaita1 a1
JOIN gea_daily_imports i ON i.id = a1.import_id
WHERE a1.cow_number IN (
  SELECT cow_number
  FROM gea_daily_ataskaita1
  WHERE cow_number IS NOT NULL AND cow_number ~ '^[0-9]+$'
  GROUP BY cow_number
  HAVING COUNT(DISTINCT ear_number) > 1
  LIMIT 5
)
ORDER BY a1.cow_number, i.created_at DESC;

-- 5. Check if the current vw_animal_latest_collar view shows the right mappings
SELECT 
  v.animal_id,
  a.tag_no as animal_ear_tag,
  v.collar_no as assigned_collar,
  latest.latest_ear_for_collar,
  CASE 
    WHEN a.tag_no = latest.latest_ear_for_collar THEN '✅ CORRECT'
    ELSE '❌ STALE - Collar reassigned to ' || latest.latest_ear_for_collar
  END as mapping_status
FROM vw_animal_latest_collar v
JOIN animals a ON a.id = v.animal_id
LEFT JOIN LATERAL (
  SELECT ear_number as latest_ear_for_collar
  FROM gea_daily_ataskaita1 a1
  JOIN gea_daily_imports i ON i.id = a1.import_id
  WHERE a1.cow_number = v.collar_no::text
  ORDER BY i.created_at DESC
  LIMIT 1
) latest ON true
WHERE v.collar_no IS NOT NULL
LIMIT 20;
