# 🔧 CRITICAL FIX: Withdrawal Period Calculation with Course Duration

## Problem Identified ✅

The withdrawal period calculation is **NOT working correctly** with multi-day courses (gydymo trukmė).

### Current Behavior (WRONG ❌)
- When you add medicines with different course durations, the system doesn't calculate withdrawal dates at all
- The `withdrawal_until_milk` and `withdrawal_until_meat` fields are `null`

### Expected Behavior (CORRECT ✅)
Each medicine should calculate its OWN withdrawal date based on its OWN course duration, then take the maximum.

**Example:**
- Treatment starts: **November 6**
- Medicine 1: 5-day withdrawal, **4-day course**
  - Calculation: 6 + 4 + 5 + 1 = **Day 16** (safe on November 16)
- Medicine 2: 6-day withdrawal, **6-day course**
  - Calculation: 6 + 6 + 6 + 1 = **Day 19** (safe on November 19)
- **Final safe date: November 19** (maximum of all medicines)

## The Fix 🔧

A corrected database function has been created that:
1. Calculates withdrawal date for EACH medicine individually using its specific course duration
2. Takes the MAXIMUM withdrawal date across all medicines
3. Properly handles both multi-day courses AND single-dose treatments

### Formula
- **For courses:** `start_date + course_days + withdrawal_days + 1`
- **For single doses:** `start_date + withdrawal_days + 1`

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Copy the Migration SQL
Open this file and copy ALL the contents:
```
supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql
```

### Step 3: Paste and Run
1. Paste the SQL into the Supabase SQL Editor
2. Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
3. Wait for confirmation message: "Success. No rows returned"

### Step 4: Verify the Fix
Run this command to test:
```bash
node test-withdrawal-calculation.js
```

You should see:
```
✅ Milk withdrawal date CORRECT: 2025-11-19
✅ Meat withdrawal date CORRECT: 2025-11-19
✅ ALL TESTS PASSED! Withdrawal calculation is CORRECT! 🎉
```

## Testing Your Real Data

After applying the fix, test with real data:

1. **Create a test treatment:**
   - Select an animal
   - Add 2 medicines with different course durations and withdrawal periods
   - For example:
     - Medicine A: 3-day course, 7-day milk withdrawal
     - Medicine B: 5-day course, 10-day meat withdrawal

2. **Check the results:**
   - The system should show withdrawal dates
   - The dates should use the MAXIMUM across all medicines
   - Each medicine's course duration should be included in the calculation

3. **Formula verification:**
   - For Medicine A: `start_date + 3 + 7 + 1 = start_date + 11 days`
   - For Medicine B: `start_date + 5 + 10 + 1 = start_date + 16 days`
   - **Final:** `start_date + 16 days` (maximum of the two)

## What This Fixes

### Before (BROKEN ❌)
- Withdrawal dates were `null` when using courses
- The function wasn't looking at course durations properly
- Multi-day treatments didn't work

### After (WORKING ✅)
- Each medicine's course duration is considered individually
- Withdrawal dates calculated correctly for all scenarios
- Maximum date taken across all medicines
- Both single-dose and multi-day courses work perfectly

## Technical Details

### Changes Made
1. **Dropped** old `calculate_withdrawal_dates` function
2. **Created** new function with per-medicine logic
3. **Handles** both `treatment_courses` (multi-day) and `usage_items` (single-dose) tables
4. **Uses** CTE (Common Table Expression) to combine all withdrawal dates
5. **Takes** MAX of all calculated dates

### Database Tables Involved
- `treatments` - Main treatment record with `reg_date`
- `treatment_courses` - Multi-day courses with `days` field
- `usage_items` - Single-dose usage records
- `products` - Medicine info with `withdrawal_days_milk` and `withdrawal_days_meat`

## Troubleshooting

### Problem: SQL Editor shows an error
**Solution:** Make sure you copied the ENTIRE SQL file, including the comment block at the top

### Problem: Test still fails after applying
**Solution:**
1. Verify the SQL ran successfully in Supabase
2. Clear your browser cache
3. Try creating a new treatment to test

### Problem: Old treatments still show null
**Solution:**
Old treatments won't be automatically updated. To update them:
1. Go to each old treatment
2. Run the calculation manually, OR
3. Run this SQL in Supabase:
```sql
-- Re-calculate all treatments
DO $$
DECLARE
  treatment_rec RECORD;
BEGIN
  FOR treatment_rec IN
    SELECT id FROM treatments WHERE withdrawal_until_milk IS NULL OR withdrawal_until_meat IS NULL
  LOOP
    PERFORM calculate_withdrawal_dates(treatment_rec.id);
  END LOOP;
END $$;
```

## Need Help?

If you encounter issues:
1. Check that the SQL ran without errors
2. Verify the function exists:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name = 'calculate_withdrawal_dates';
   ```
3. Run the test script to see detailed output
4. Check browser console for errors

---

**Created:** 2025-11-06
**Priority:** CRITICAL
**Status:** Ready to apply
**Estimated time:** 2 minutes
