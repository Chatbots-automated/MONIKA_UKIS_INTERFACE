-- Test script for animal departures system
-- Run this after applying the migration

-- Test 1: Insert a test departure for an animal that exists
-- (Replace with an actual animal number from your database)
SELECT * FROM upsert_animal_departure(
  p_animal_number := 'LT000008370444',
  p_departure_date := '2026-04-07',
  p_gender := 'Karvė',
  p_birth_date := '2021-03-16',
  p_vet_reason_code := '17',
  p_destination_name := 'PANEVĖŽIO RAJONO ŽŪB ''BERČIŪNAI''',
  p_destination_herd_number := '11198300328',
  p_source_name := 'PANEVĖŽIO RAJONO ŽŪB ''BERČIŪNAI''',
  p_source_herd_number := '11198300328',
  p_entered_by := 'INDRĖ ILONYTĖ'
);

-- Test 2: Check the inserted record
SELECT * FROM vw_animal_departures_with_conflicts
WHERE animal_number = 'LT000008370444'
ORDER BY departure_date DESC
LIMIT 5;

-- Test 3: Insert another animal from your sample data
SELECT * FROM upsert_animal_departure(
  p_animal_number := 'LT000044229119',
  p_departure_date := '2026-04-07',
  p_gender := 'Karvė',
  p_birth_date := '2024-04-22',
  p_vet_reason_code := '17',
  p_destination_name := 'PANEVĖŽIO RAJONO ŽŪB ''BERČIŪNAI''',
  p_destination_herd_number := '11198300328',
  p_source_name := 'PANEVĖŽIO RAJONO ŽŪB ''BERČIŪNAI''',
  p_source_herd_number := '11198300328',
  p_entered_by := 'INDRĖ ILONYTĖ'
);

-- Test 4: Try to insert the same animal + date again (should UPDATE, not duplicate)
SELECT * FROM upsert_animal_departure(
  p_animal_number := 'LT000008370444',
  p_departure_date := '2026-04-07',
  p_gender := 'Karvė',
  p_birth_date := '2021-03-16',
  p_reason := 'Updated reason', -- Changed field
  p_vet_reason_code := '17',
  p_destination_name := 'PANEVĖŽIO RAJONO ŽŪB ''BERČIŪNAI''',
  p_destination_herd_number := '11198300328',
  p_source_name := 'PANEVĖŽIO RAJONO ŽŪB ''BERČIŪNAI''',
  p_source_herd_number := '11198300328',
  p_entered_by := 'INDRĖ ILONYTĖ'
);

-- Test 5: Verify no duplicate was created (should still be 1 record for this animal+date)
SELECT COUNT(*) as record_count
FROM animal_departures
WHERE animal_number = 'LT000008370444'
  AND departure_date = '2026-04-07';
-- Expected: 1

-- Test 6: Check all departures with conflicts
SELECT 
  animal_number,
  departure_date,
  has_withdrawal_conflict,
  milk_conflict_days,
  meat_conflict_days,
  conflict_details
FROM vw_animal_departures_with_conflicts
WHERE has_withdrawal_conflict = true
ORDER BY departure_date DESC;

-- Test 7: Get summary statistics
SELECT 
  COUNT(*) as total_departures,
  COUNT(*) FILTER (WHERE has_withdrawal_conflict) as with_conflicts,
  COUNT(*) FILTER (WHERE animal_id IS NULL) as not_found_in_db,
  COUNT(*) FILTER (WHERE animal_id IS NOT NULL AND NOT has_withdrawal_conflict) as clean_departures
FROM animal_departures;

-- Test 8: Check if animals exist in database
SELECT 
  'LT000008370444' as animal_number,
  EXISTS(SELECT 1 FROM animals WHERE tag_no = 'LT000008370444') as exists_in_db
UNION ALL
SELECT 
  'LT000044229119',
  EXISTS(SELECT 1 FROM animals WHERE tag_no = 'LT000044229119');

-- Test 9: Create a test scenario with withdrawal conflict
-- First, find an animal that has recent treatments
SELECT 
  a.tag_no,
  a.id,
  MAX(t.withdrawal_until_milk) as last_milk_withdrawal,
  MAX(t.withdrawal_until_meat) as last_meat_withdrawal
FROM animals a
JOIN treatments t ON t.animal_id = a.id
WHERE t.withdrawal_until_milk > CURRENT_DATE - INTERVAL '30 days'
   OR t.withdrawal_until_meat > CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.tag_no, a.id
ORDER BY MAX(t.withdrawal_until_milk) DESC
LIMIT 5;

-- Test 10: Clean up test data (optional - uncomment to run)
-- DELETE FROM animal_departures WHERE animal_number IN ('LT000008370444', 'LT000044229119');

-- Test 11: View the table structure
\d animal_departures

-- Test 12: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'animal_departures';
