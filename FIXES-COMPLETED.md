# ✅ FIXES COMPLETED - Withdrawal Calculation & Animal Sidepanel

## Summary

Fixed TWO critical issues:
1. **Withdrawal period calculation** not working with course durations (gydymo trukmė)
2. **Animal sidepanel** not supporting per-medicine course duration and not displaying withdrawal dates

## Issue #1: Withdrawal Calculation Bug

### Problem
When creating treatments with multi-day courses through the "Gydymas/Nurašymas" section, the withdrawal dates (karencines dienos) were **not calculating at all** - they showed as `null`.

### Root Cause
The database function `calculate_withdrawal_dates` was using incorrect logic that:
- Took the MAX course days across ALL medicines
- Applied it universally instead of per-medicine
- This broke the calculation completely

### Solution
Created new SQL migration that:
- Calculates withdrawal for **EACH medicine individually** using its specific course duration
- Takes the **MAXIMUM** date across all medicines
- Uses correct formula: `start_date + course_days + withdrawal_days + 1`

### Formula Example
```
Treatment starts: November 6

Medicine 1:
  • 4-day course
  • 5-day milk withdrawal
  → Calculation: 6 + 4 + 5 + 1 = Day 16

Medicine 2:
  • 6-day course
  • 6-day meat withdrawal
  → Calculation: 6 + 6 + 6 + 1 = Day 19

Result: Safe on Day 19 (maximum)
```

### What You Need To Do ⚠️
**APPLY THE SQL MIGRATION:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of: `supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql`
3. Paste and run in SQL Editor
4. Verify with: `node test-withdrawal-calculation.js`

## Issue #2: Animal Sidepanel Missing Features

### Problems Found
1. **No per-medicine course duration** - Had one "treatment duration" field for the whole treatment instead of per-medicine
2. **Wrong withdrawal calculation** - Used old `withdrawal_days` field instead of separate `withdrawal_days_milk` and `withdrawal_days_meat`
3. **Wrong display fields** - Checked for `withdrawal_until` instead of `withdrawal_until_milk` and `withdrawal_until_meat`
4. **Not creating courses** - Saved only to `usage_items`, never to `treatment_courses` table
5. **Not calling database function** - Didn't trigger `calculate_withdrawal_dates` after saving

### Solutions Implemented

#### 1. Added Per-Medicine Course Duration
**Before:**
```typescript
medications: Array<{
  product_id, batch_id, qty, unit, purpose
}>
```

**After:**
```typescript
medications: Array<{
  product_id, batch_id, qty, unit, purpose,
  is_course: boolean,      // NEW: Checkbox for multi-day course
  course_days: string      // NEW: Number of days for this specific medicine
}>
```

#### 2. Updated UI to Show Course Fields
Each medication now has:
- ☑️ **"Kursas (keli dienas)"** checkbox
- 🔢 **Days input** field (appears when checked)
- 📊 **Daily dose calculator** (total_dose / days)
- 🥛 **Separate milk withdrawal days**
- 🥩 **Separate meat withdrawal days**

#### 3. Fixed Saving Logic
**Before:**
```typescript
// Always saved to usage_items only
await supabase.from('usage_items').insert({...})
```

**After:**
```typescript
// Check if it's a course
if (med.is_course && parseInt(med.course_days) > 1) {
  // Multi-day course → save to treatment_courses
  await supabase.from('treatment_courses').insert({
    treatment_id,
    product_id,
    batch_id,
    total_dose: totalQty,
    days: days,
    daily_dose: totalQty / days,
    unit,
    start_date
  });
} else {
  // Single dose → save to usage_items
  await supabase.from('usage_items').insert({...});
}

// NEW: Call database function to calculate withdrawal dates
await supabase.rpc('calculate_withdrawal_dates', {
  p_treatment_id: treatmentRecord.id
});
```

#### 4. Fixed Display in Apžvalga Section
**Before:**
```tsx
{treatment.withdrawal_until && (
  <div>Nurašymo periodas: {formatDateLT(treatment.withdrawal_until)}</div>
)}
```

**After:**
```tsx
{(treatment.withdrawal_until_milk || treatment.withdrawal_until_meat) && (
  <div className="bg-amber-50 border-2 border-amber-300">
    <div className="font-bold">⚠️ Karencinės dienos</div>
    {treatment.withdrawal_until_milk && (
      <div>🥛 Pienas iki: {formatDateLT(treatment.withdrawal_until_milk)}</div>
    )}
    {treatment.withdrawal_until_meat && (
      <div>🥩 Mėsa iki: {formatDateLT(treatment.withdrawal_until_meat)}</div>
    )}
  </div>
)}
```

#### 5. Added Withdrawal Preview Calculator
Shows calculation **BEFORE** saving so user knows what to expect:

```
Medicine 1 (Penicilin):
  • Kursas: 4 dienų
  • 🥛 Pienas: 4 + 5 + 1 = 10 dienų
  • 🥩 Mėsa: 4 + 7 + 1 = 12 dienų

Medicine 2 (Gentamicin):
  • Kursas: 6 dienų
  • 🥛 Pienas: 6 + 6 + 1 = 13 dienų
  • 🥩 Mėsa: 6 + 10 + 1 = 17 dienų

ℹ️ Tikslios datos bus apskaičiuotos automatiškai po išsaugojimo
```

#### 6. Removed Old Fields
- ❌ Removed global "Gydymo trukmė (dienų)" field
- ❌ Removed "Nurašymas iki (automatinis)" display field
- ✅ Now uses per-medicine course duration
- ✅ Withdrawal dates calculated by database

## Files Changed

### Database
- `supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql` - NEW migration

### Frontend
- `src/components/AnimalDetailSidebar.tsx` - Major updates:
  - Added `is_course` and `course_days` to medication structure
  - Added course duration UI fields per medicine
  - Fixed saving logic to create `treatment_courses` entries
  - Added call to `calculate_withdrawal_dates` RPC
  - Fixed display to show `withdrawal_until_milk` and `withdrawal_until_meat`
  - Added withdrawal calculation preview
  - Removed old global treatment duration field

## Testing Files Created
- `test-withdrawal-calculation.js` - Automated test for database function
- `WITHDRAWAL-FIX-INSTRUCTIONS.md` - Detailed instructions
- `APPLY-THIS-SQL.txt` - Quick reference
- `FIXES-COMPLETED.md` - This file

## How To Test

### 1. Apply SQL Migration FIRST
```bash
# Open Supabase Dashboard → SQL Editor
# Copy and run: supabase/migrations/20251106000000_fix_withdrawal_with_individual_course_duration.sql
```

### 2. Verify Migration
```bash
node test-withdrawal-calculation.js
# Should show: ✅ ALL TESTS PASSED!
```

### 3. Test in UI (Animal Sidepanel)
1. Go to "Gyvūnai" section
2. Click on an animal to open sidepanel
3. Click "Naujas Vizitas" button
4. Select "Gydymas" procedure
5. Add medications:
   - Click "Pridėti vaistą"
   - Select a medicine with withdrawal days
   - ☑️ Check "Kursas (keli dienas)"
   - Enter number of days (e.g., 4)
   - Enter total quantity
   - See preview calculation appear below
6. Add second medicine with different course duration
7. Save the visit
8. Check "Apžvalga" section - should show:
   - 🥛 Pienas iki: [date]
   - 🥩 Mėsa iki: [date]

### 4. Test in Gydymas/Nurašymas Section
1. Go to "Gydymas / Nurašymas"
2. Create treatment with course duration
3. Verify withdrawal dates calculate properly

## Expected Behavior

### Before Fixes ❌
- Withdrawal dates were `null`
- No per-medicine course duration
- Couldn't see karencinės dienos in animal sidepanel
- Treatments from sidepanel didn't calculate withdrawals

### After Fixes ✅
- Withdrawal dates calculated correctly
- Each medicine has its own course duration
- Karencinės dienos visible in Apžvalga
- Separate milk and meat withdrawal dates
- Preview calculation before saving
- Works from both "Gydymas/Nurašymas" and animal sidepanel

## Important Notes

### Migration MUST Be Applied
The SQL migration is **CRITICAL** and **MUST** be applied to your Supabase database. Without it:
- Withdrawal calculations will NOT work
- Dates will remain `null`
- The system cannot track karencinės dienos

### Formula Verification
The formula is exactly as you specified:
- **Courses:** `start_date + course_days + withdrawal_days + 1`
- **Single doses:** `start_date + 0 + withdrawal_days + 1`
- **Final date:** MAXIMUM across all medicines

Example:
- Med 1: Nov 6 + 4 days + 5 withdrawal + 1 = **Nov 16**
- Med 2: Nov 6 + 6 days + 6 withdrawal + 1 = **Nov 19**
- **Result: Nov 19** (the maximum)

### Data Safety
- Old treatments won't be automatically updated
- New treatments will calculate correctly
- To update old treatments, re-save them OR run SQL:
  ```sql
  SELECT calculate_withdrawal_dates(id) FROM treatments;
  ```

## Build Status
✅ Project builds successfully
✅ TypeScript compilation passes
✅ No errors or warnings

## Next Steps
1. **APPLY THE SQL MIGRATION** (most critical!)
2. Test with real data
3. Verify both entry points work:
   - Gydymas/Nurašymas section
   - Animal sidepanel
4. Check that withdrawal dates appear in Apžvalga
5. Verify calculations match the formula

---

**Status:** READY FOR TESTING
**Priority:** CRITICAL
**Blocked By:** SQL migration needs to be applied
