-- =============================================================================
-- TREATMENT TRANSFER TEST SCRIPT
-- =============================================================================
-- This script helps verify the treatment transfer functionality works correctly
-- Run these queries BEFORE and AFTER the transfer to verify everything works
-- =============================================================================

-- =============================================================================
-- STEP 1: FIND A TREATMENT TO TEST WITH
-- =============================================================================
-- Find treatments with pending visits and withdrawal periods
SELECT 
  t.id as treatment_id,
  a.tag_no as current_animal,
  a.species,
  t.reg_date,
  t.withdrawal_until_meat,
  t.withdrawal_until_milk,
  (SELECT COUNT(*) FROM animal_visits av 
   WHERE (av.related_treatment_id = t.id OR av.course_id IN (
     SELECT id FROM treatment_courses WHERE treatment_id = t.id
   ))
   AND av.status IN ('Planuojamas', 'Vykdomas')
  ) as pending_visits_count,
  (SELECT COUNT(*) FROM treatment_courses WHERE treatment_id = t.id) as courses_count
FROM treatments t
JOIN animals a ON t.animal_id = a.id
WHERE t.withdrawal_until_meat IS NOT NULL 
   OR t.withdrawal_until_milk IS NOT NULL
ORDER BY t.reg_date DESC
LIMIT 10;

-- =============================================================================
-- STEP 2: CHECK CURRENT STATE (BEFORE TRANSFER)
-- =============================================================================
-- Replace 'YOUR_TREATMENT_ID' with actual treatment ID from step 1

-- Check treatment details
SELECT 
  t.id,
  t.animal_id,
  a.tag_no as animal_tag,
  t.reg_date,
  t.withdrawal_until_meat,
  t.withdrawal_until_milk,
  t.created_at,
  t.updated_at
FROM treatments t
JOIN animals a ON t.animal_id = a.id
WHERE t.id = 'YOUR_TREATMENT_ID';

-- Check treatment courses
SELECT 
  tc.id,
  tc.treatment_id,
  p.name as product_name,
  tc.days,
  tc.status,
  tc.start_date
FROM treatment_courses tc
JOIN products p ON tc.product_id = p.id
WHERE tc.treatment_id = 'YOUR_TREATMENT_ID';

-- Check pending visits
SELECT 
  av.id,
  av.animal_id,
  a.tag_no as animal_tag,
  av.visit_datetime,
  av.status,
  av.related_treatment_id,
  av.course_id,
  av.procedures
FROM animal_visits av
JOIN animals a ON av.animal_id = a.id
WHERE (
  av.related_treatment_id = 'YOUR_TREATMENT_ID'
  OR av.course_id IN (
    SELECT id FROM treatment_courses WHERE treatment_id = 'YOUR_TREATMENT_ID'
  )
)
ORDER BY av.visit_datetime;

-- Check usage items
SELECT 
  ui.id,
  ui.treatment_id,
  p.name as product_name,
  ui.qty,
  ui.unit
FROM usage_items ui
JOIN products p ON ui.product_id = p.id
WHERE ui.treatment_id = 'YOUR_TREATMENT_ID';

-- =============================================================================
-- STEP 3: FIND TARGET ANIMAL
-- =============================================================================
-- Find active animals to transfer to (exclude current animal)
SELECT 
  id,
  tag_no,
  species,
  holder_name
FROM animals
WHERE is_active = true
  AND id != (SELECT animal_id FROM treatments WHERE id = 'YOUR_TREATMENT_ID')
ORDER BY tag_no
LIMIT 20;

-- =============================================================================
-- STEP 4: PERFORM TRANSFER (via UI or SQL)
-- =============================================================================
-- Option A: Use the UI (Admin > ŽURNALAS)
-- Option B: Run SQL directly:

/*
SELECT transfer_treatment_to_animal(
  p_treatment_id := 'YOUR_TREATMENT_ID',
  p_old_animal_id := 'OLD_ANIMAL_ID',
  p_new_animal_id := 'NEW_ANIMAL_ID',
  p_reason := 'Testing treatment transfer'
);
*/

-- =============================================================================
-- STEP 5: VERIFY TRANSFER (AFTER TRANSFER)
-- =============================================================================

-- Verify treatment was transferred
SELECT 
  t.id,
  t.animal_id as new_animal_id,
  a.tag_no as new_animal_tag,
  t.reg_date,
  t.withdrawal_until_meat,
  t.withdrawal_until_milk,
  t.updated_at
FROM treatments t
JOIN animals a ON t.animal_id = a.id
WHERE t.id = 'YOUR_TREATMENT_ID';

-- Verify pending visits were transferred
SELECT 
  av.id,
  av.animal_id as new_animal_id,
  a.tag_no as new_animal_tag,
  av.visit_datetime,
  av.status,
  av.related_treatment_id,
  av.course_id,
  av.procedures
FROM animal_visits av
JOIN animals a ON av.animal_id = a.id
WHERE (
  av.related_treatment_id = 'YOUR_TREATMENT_ID'
  OR av.course_id IN (
    SELECT id FROM treatment_courses WHERE treatment_id = 'YOUR_TREATMENT_ID'
  )
)
AND av.status IN ('Planuojamas', 'Vykdomas')
ORDER BY av.visit_datetime;

-- Verify completed visits stayed with old animal
SELECT 
  av.id,
  av.animal_id as old_animal_id,
  a.tag_no as old_animal_tag,
  av.visit_datetime,
  av.status,
  av.related_treatment_id,
  av.course_id
FROM animal_visits av
JOIN animals a ON av.animal_id = a.id
WHERE (
  av.related_treatment_id = 'YOUR_TREATMENT_ID'
  OR av.course_id IN (
    SELECT id FROM treatment_courses WHERE treatment_id = 'YOUR_TREATMENT_ID'
  )
)
AND av.status = 'Baigtas'
ORDER BY av.visit_datetime;

-- Verify treatment courses still linked (they inherit from treatment)
SELECT 
  tc.id,
  tc.treatment_id,
  t.animal_id as new_animal_id,
  a.tag_no as new_animal_tag,
  p.name as product_name,
  tc.days,
  tc.status
FROM treatment_courses tc
JOIN treatments t ON tc.treatment_id = t.id
JOIN animals a ON t.animal_id = a.id
JOIN products p ON tc.product_id = p.id
WHERE tc.treatment_id = 'YOUR_TREATMENT_ID';

-- Verify usage items still linked (they inherit from treatment)
SELECT 
  ui.id,
  ui.treatment_id,
  t.animal_id as new_animal_id,
  a.tag_no as new_animal_tag,
  p.name as product_name,
  ui.qty,
  ui.unit
FROM usage_items ui
JOIN treatments t ON ui.treatment_id = t.id
JOIN animals a ON t.animal_id = a.id
JOIN products p ON ui.product_id = p.id
WHERE ui.treatment_id = 'YOUR_TREATMENT_ID';

-- =============================================================================
-- STEP 6: CHECK WITHDRAWAL PERIODS
-- =============================================================================

-- Check OLD animal - should NOT have withdrawal period from this treatment
SELECT 
  a.id,
  a.tag_no,
  t.id as treatment_id,
  t.withdrawal_until_meat,
  t.withdrawal_until_milk
FROM animals a
LEFT JOIN treatments t ON t.animal_id = a.id
WHERE a.id = 'OLD_ANIMAL_ID'
  AND (t.withdrawal_until_meat > CURRENT_DATE OR t.withdrawal_until_milk > CURRENT_DATE);

-- Check NEW animal - should have withdrawal period from transferred treatment
SELECT 
  a.id,
  a.tag_no,
  t.id as treatment_id,
  t.withdrawal_until_meat,
  t.withdrawal_until_milk,
  CASE 
    WHEN t.withdrawal_until_meat > CURRENT_DATE THEN 
      (t.withdrawal_until_meat - CURRENT_DATE) || ' days'
    ELSE 'Expired'
  END as meat_withdrawal_remaining,
  CASE 
    WHEN t.withdrawal_until_milk > CURRENT_DATE THEN 
      (t.withdrawal_until_milk - CURRENT_DATE) || ' days'
    ELSE 'Expired'
  END as milk_withdrawal_remaining
FROM animals a
JOIN treatments t ON t.animal_id = a.id
WHERE a.id = 'NEW_ANIMAL_ID'
  AND t.id = 'YOUR_TREATMENT_ID';

-- =============================================================================
-- STEP 7: CHECK AUDIT LOG
-- =============================================================================

-- Check audit log for transfer action
SELECT 
  id,
  action,
  table_name,
  record_id,
  old_data,
  new_data,
  user_id,
  created_at
FROM user_audit_logs
WHERE action = 'transfer_treatment'
  AND record_id = 'YOUR_TREATMENT_ID'
ORDER BY created_at DESC
LIMIT 1;

-- =============================================================================
-- VERIFICATION CHECKLIST
-- =============================================================================
/*
After transfer, verify:

✓ Treatment.animal_id changed to new animal
✓ Pending visits transferred to new animal
✓ Completed visits stayed with old animal
✓ Treatment courses still linked to treatment
✓ Usage items still linked to treatment
✓ Withdrawal periods moved to new animal
✓ Old animal no longer has withdrawal from this treatment
✓ Audit log entry created
✓ Function returned success JSON

If any of these fail, check:
- Migration was applied correctly
- RLS policies allow the operation
- Function has correct permissions
- No foreign key constraint violations
*/
