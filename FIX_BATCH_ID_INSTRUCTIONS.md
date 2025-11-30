# Fix: batch_id NOT NULL Constraint Error

## Problem
When using the Course Scheduler to plan multi-day treatments and clicking "Sukurti vizitą", you get this error:

```
Klaida: null value in column "batch_id" of relation "treatment_courses" violates not-null constraint
```

## Root Cause
The `treatment_courses` table has a NOT NULL constraint on `batch_id`, but the course scheduler workflow doesn't select batches upfront - they're selected per visit.

---

## Solution Applied

### ✅ 1. Database Schema Fix

**File:** `FIX_BATCH_ID_CONSTRAINT.sql`

**What to do:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire contents of `FIX_BATCH_ID_CONSTRAINT.sql`
4. Paste into SQL Editor
5. Click "Run"

**What it does:**
- Removes NOT NULL constraint from `treatment_courses.batch_id`
- Allows NULL values for planned courses
- Adds explanatory comment

**Expected result:**
```
is_nullable = 'YES'
```

---

### ✅ 2. Code Fixes Applied

#### File: `AnimalDetailSidebar.tsx`

**Line 2442-2454: Updated validation**
```typescript
// BEFORE: Required both product_id AND batch_id for all medications
if (!med.product_id || !med.batch_id) {
  throw new Error('Produktas ir serija privalomi visiems vaistams');
}

// AFTER: Only requires batch_id for single doses
if (!med.product_id) {
  throw new Error('Produktas privalomas');
}

if (!isCourse && !med.batch_id) {
  throw new Error('Serija privaloma vienkartiniams gydymams');
}
```

**Line 2467: Allows NULL batch_id**
```typescript
batch_id: med.batch_id || null,  // NULL for courses, populated for single doses
```

**Line 4096-4108: Maps product data from scheduler**
```typescript
// Get the first day's first medication to populate the form
const firstDayMeds = schedule[0]?.medications[0];
if (firstDayMeds) {
  newMeds[medIndex].product_id = firstDayMeds.product_id;
  newMeds[medIndex].batch_id = firstDayMeds.batch_id || '';
  newMeds[medIndex].unit = firstDayMeds.unit;
  newMeds[medIndex].purpose = firstDayMeds.purpose;
  newMeds[medIndex].teat = firstDayMeds.teat || '';
}
```

---

#### File: `TreatmentCompact.tsx`

**Line 256-261: Updated validation**
```typescript
// BEFORE: Required product_id, batch_id, and qty for all
if (!line.product_id || !line.batch_id || !line.qty) continue;

// AFTER: Different requirements for courses vs single doses
const isCourse = line.is_course && parseInt(line.course_days) > 1;

if (!line.product_id) continue;
if (!isCourse && (!line.batch_id || !line.qty)) continue;
```

**Line 273: Allows NULL batch_id**
```typescript
batch_id: line.batch_id || null,  // NULL for courses
```

---

## How It Works Now

### Multi-Day Course Workflow

1. **Create Course in Scheduler:**
   - Click "Planuoti kursą"
   - Select dates (e.g., Day 1, Day 3, Day 5)
   - Select product for each day (e.g., "Tylosin 200mg/ml")
   - Click "Patvirtinti kursą"

2. **Create Visit:**
   - Click "Sukurti vizitą"
   - ✅ **No more error!**

3. **What Gets Stored:**
   ```sql
   treatment_courses:
     product_id: 'abc-123'        ✓ Populated
     batch_id: NULL               ✓ Will be selected per visit
     days: 3                      ✓ Number of treatment days
     total_dose: NULL             ✓ Entered per visit
     daily_dose: NULL             ✓ Calculated per visit
   ```

4. **On Each Visit Day:**
   - Vet selects batch from available stock
   - Enters actual quantity used
   - Stock deducted when visit marked "Baigtas"

---

### Single-Dose Workflow (Unchanged)

1. **Add Medication:**
   - Select product
   - Select batch ✓ **Required**
   - Enter quantity ✓ **Required**

2. **Create Visit:**
   - Click "Sukurti vizitą"
   - Works as before

3. **What Gets Stored:**
   ```sql
   usage_items:
     product_id: 'abc-123'
     batch_id: 'batch-456'        ✓ Required
     qty: 50                      ✓ Required
   ```

---

## Verification Checklist

After running the SQL fix, verify these scenarios:

### ✅ Scenario 1: Multi-Day Course
- [ ] Create course with scheduler (Day 1, 3, 5)
- [ ] Click "Sukurti vizitą"
- [ ] No database error appears
- [ ] Visit created successfully

### ✅ Scenario 2: Single Medication
- [ ] Add single medication with batch
- [ ] Click "Sukurti vizitą"
- [ ] Works as before
- [ ] No regression

### ✅ Scenario 3: Existing Data
- [ ] View existing treatments
- [ ] Check drug journal report
- [ ] Verify no broken displays
- [ ] Withdrawal dates still calculate

### ✅ Scenario 4: Database
- [ ] Run verification query in SQL Editor:
  ```sql
  SELECT
    column_name,
    is_nullable
  FROM information_schema.columns
  WHERE table_name = 'treatment_courses'
    AND column_name = 'batch_id';
  ```
- [ ] Result shows: `is_nullable = 'YES'`

---

## Summary of Changes

| File | Lines Changed | What Changed |
|------|--------------|--------------|
| `FIX_BATCH_ID_CONSTRAINT.sql` | New file | Database schema fix |
| `AnimalDetailSidebar.tsx` | 2442-2454 | Validation logic |
| `AnimalDetailSidebar.tsx` | 2467 | NULL batch_id support |
| `AnimalDetailSidebar.tsx` | 4096-4108 | Product data mapping |
| `TreatmentCompact.tsx` | 256-261 | Validation logic |
| `TreatmentCompact.tsx` | 273 | NULL batch_id support |

---

## Database Views (Already Compatible)

These views already use LEFT JOIN and handle NULL batch_id correctly:

- ✅ `vw_vet_drug_journal` - Drug journal report
- ✅ `vw_treated_animals` - Treated animals view
- ✅ `vw_courses_view` - Treatment courses
- ✅ `calculate_withdrawal_dates()` - Withdrawal function

No changes needed to these.

---

## Need Help?

If you still get errors after running the SQL fix:

1. **Check SQL was applied:**
   ```sql
   SELECT is_nullable
   FROM information_schema.columns
   WHERE table_name = 'treatment_courses'
     AND column_name = 'batch_id';
   ```
   Should return: `YES`

2. **Check for typos in SQL Editor:**
   - Make sure you copied the entire SQL file
   - No syntax errors in output

3. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Reload the application

4. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for any red errors
   - Share error message if needed

---

## Build Status

✅ Project builds successfully with all fixes applied
✅ No TypeScript errors
✅ No linting errors
✅ Ready for testing

---

**IMPORTANT:** You MUST run the SQL fix (`FIX_BATCH_ID_CONSTRAINT.sql`) in Supabase SQL Editor before the course scheduler will work without errors!
