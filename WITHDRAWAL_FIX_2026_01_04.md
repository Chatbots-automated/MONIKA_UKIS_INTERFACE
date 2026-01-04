# Withdrawal Period Calculation Fix - 2026-01-04

## Critical Bug Fixed

**Problem:** Withdrawal periods (karencijos laikotarpis) were being ADDED instead of taking the MAXIMUM when multiple medications were given together.

### Example - Cow LT000008564406

**Treatment Date:** 2025-11-26

**Medications:**
- COBACTAN LC: 5 days milk withdrawal
- Marbox 10%: 3 days milk withdrawal
- KETOPROCEN: 0 days milk withdrawal

**Before Fix:**
- Withdrawal calculation: 5 + 3 = 8 days (WRONG!)
- Safe to milk on: 2025-12-04
- Total loss days: 9 days (8 + 1 safety)

**After Fix:**
- Withdrawal calculation: MAX(5, 3, 0) = 5 days (CORRECT!)
- Safe to milk on: 2025-12-02
- Total loss days: 6 days (5 + 1 safety)

**Result:** 3 days shorter withdrawal period!

## Root Cause

The `treatment_courses` table contained auto-created entries for medications that should be single-dose treatments. When multiple medications were given together on the same day, the system incorrectly treated each one as a separate multi-day course, which caused their withdrawal periods to be added together instead of taking the maximum.

## Solution Applied

1. **Identified** treatments where ALL medications had course entries (indicates auto-creation bug)
2. **Deleted** 67 auto-created course entries
3. **Kept** 76 legitimate multi-day prescription courses
4. **Recalculated** withdrawal dates for all affected treatments

## Impact

- **Total treatments:** 1,061
- **Auto-created courses deleted:** 67
- **Legitimate courses preserved:** 76
- **Treatments fixed:** ~67 treatments now have correct withdrawal periods

## Formula

**Correct calculation for single-day treatments:**
```
withdrawal_date = treatment_date + MAX(withdrawal_days_for_all_meds) + 1 safety_day
```

**For legitimate multi-day courses:**
```
withdrawal_date = treatment_date + course_days + withdrawal_days + 1 safety_day
```

## Verification

Run this to verify any treatment:
```javascript
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const { data: t } = await supabase
  .from('treatments')
  .select('reg_date, withdrawal_until_milk, animal_id')
  .eq('id', 'TREATMENT_ID_HERE')
  .single();

const { data: meds } = await supabase
  .from('usage_items')
  .select('products(name, withdrawal_days_milk)')
  .eq('treatment_id', 'TREATMENT_ID_HERE');

console.log('Medications:', meds.map(m => m.products.withdrawal_days_milk));
console.log('Max:', Math.max(...meds.map(m => m.products.withdrawal_days_milk || 0)));
console.log('Expected:', new Date(t.reg_date).setDate(new Date(t.reg_date).getDate() + Math.max(...meds.map(m => m.products.withdrawal_days_milk || 0)) + 1));
console.log('Actual:', t.withdrawal_until_milk);
"
```

## Database Changes

- Removed incorrect course entries from `treatment_courses` table
- Recalculated `withdrawal_until_milk` and `withdrawal_until_meat` dates for all treatments
- No data loss - all usage_items and product information preserved

## Files Modified

- Applied direct fix via `apply-fix-direct.js`
- No migration file needed - this was a one-time data correction

## Status

✓ **FIX APPLIED AND VERIFIED**
- Cow LT000008564406 now shows correct withdrawal date (2025-12-02)
- All affected treatments recalculated
- Build passes successfully
