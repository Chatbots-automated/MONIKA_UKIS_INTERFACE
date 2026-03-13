# Treatment Transfer - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Apply Migration
```bash
cd supabase
supabase db push
```

### 2. Verify Function Exists
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'transfer_treatment_to_animal';
```
Should return 1 row.

### 3. Test in UI
1. Go to **Admin** tab
2. Click **ŽURNALAS**
3. Enter your password
4. Find any treatment
5. Click **"Perkelti"**
6. Check if dropdown shows animals
7. Select an animal
8. Click **"Perkelti gydymą"**
9. Confirm

## ✅ Quick Verification

After transfer, run this query:
```sql
-- Replace with your actual IDs
SELECT 
  'Treatment' as check_type,
  t.id,
  a.tag_no as current_animal,
  t.withdrawal_until_meat,
  t.withdrawal_until_milk
FROM treatments t
JOIN animals a ON t.animal_id = a.id
WHERE t.id = 'YOUR_TREATMENT_ID'

UNION ALL

SELECT 
  'Pending Visits' as check_type,
  av.id,
  a.tag_no as current_animal,
  av.visit_datetime::text,
  av.status
FROM animal_visits av
JOIN animals a ON av.animal_id = a.id
WHERE av.related_treatment_id = 'YOUR_TREATMENT_ID'
  AND av.status IN ('Planuojamas', 'Vykdomas');
```

## 🔍 What to Check

### ✅ Success Indicators
- Treatment shows under new animal
- Pending visits show under new animal
- Old animal has no withdrawal from this treatment
- Success message in UI
- Audit log entry created

### ❌ Failure Indicators
- Error message in UI
- Treatment still under old animal
- Visits not transferred
- Console errors
- Database errors

## 🐛 Quick Troubleshooting

### Dropdown Empty?
```javascript
// Check browser console for:
"Loading animals..."
"Loaded animals: X"

// If X = 0, run:
```
```sql
SELECT COUNT(*) FROM animals WHERE is_active = true;
-- Should return > 0
```

### Transfer Fails?
```sql
-- Check function exists and has permissions
SELECT has_function_privilege('transfer_treatment_to_animal(uuid,uuid,uuid,text)', 'execute');
-- Should return true
```

### Old Animal Still Has Withdrawal?
```sql
-- Check if treatment actually transferred
SELECT animal_id FROM treatments WHERE id = 'YOUR_TREATMENT_ID';
-- Should be new animal ID, not old
```

## 📞 Need Help?

1. **Check logs**: Browser console + Database logs
2. **Run test script**: `test-treatment-transfer.sql`
3. **Read full docs**: `FINAL_CHANGES_SUMMARY.md`
4. **Check implementation**: `TREATMENT_TRANSFER_IMPLEMENTATION.md`

## 🎯 Common Use Case

**Scenario**: Cow #001 dying, has 2 weeks withdrawal, medicine safe for meat

**Solution**:
1. Admin > ŽURNALAS
2. Find Cow #001's treatment
3. Click "Perkelti"
4. Select Cow #002
5. Confirm
6. ✅ Cow #001 free to sell
7. ✅ Cow #002 continues treatment

## 📊 Quick Stats

After successful transfer:
- **Treatment**: Moved to new animal
- **Pending Visits**: Moved to new animal
- **Completed Visits**: Stay with old animal
- **Courses**: Automatically follow treatment
- **Usage Items**: Automatically follow treatment
- **Withdrawal**: Moved to new animal

## ⚡ Performance

- Transfer time: < 1 second
- Affects: 1 treatment + N pending visits
- Database operations: 2 UPDATEs (treatment + visits)
- Audit log: 1 INSERT
- No data loss
- Fully transactional

## 🔒 Safety

- ✅ Requires authentication
- ✅ Requires confirmation
- ✅ Validates both animals exist
- ✅ Validates treatment ownership
- ✅ Cannot transfer to same animal
- ✅ Full audit trail
- ✅ Transactional (all or nothing)

## 📝 Quick Checklist

Before going live:
- [ ] Migration applied
- [ ] Function exists
- [ ] Tested with test data
- [ ] Verified withdrawal transfer
- [ ] Checked audit logs
- [ ] Trained admin users
- [ ] Documented process
- [ ] Backup created

## 🎉 You're Ready!

The feature is production-ready. Just apply the migration and test!
