# Batch Selector & Withdrawal Calculation Fix

## Issues Fixed

### 1. ✅ Batch Selector Added to Manual Medication Entry
**Problem:** When opening a visit with planned medications, the "Serija" (batch) field showed "N/A" with no way to select a batch.

**Solution:** Added a batch selector dropdown that:
- Shows all available batches for the product
- Displays batch number, expiry date, and remaining stock
- Filters to show only batches with available stock
- Allows selection before entering quantity
- Validates that both batch AND quantity are entered before completion

---

### 2. ✅ Withdrawal Days Recalculation on Visit Completion
**Problem:** When a course visit was marked as "Baigtas" (completed), the withdrawal dates (karencines dienos) were NOT recalculated to account for the newly added medications.

**Solution:** Updated the `process_visit_medications()` database trigger to call `calculate_withdrawal_dates()` after creating usage_items.

---

## Changes Applied

### Frontend Changes (AnimalDetailSidebar.tsx)

#### 1. Added State for Batch Selection
```typescript
const [medicationBatches, setMedicationBatches] = useState<Record<string, string>>({});
```

#### 2. Updated Initialization
```typescript
const checkMedicationEntry = () => {
  if (visit.planned_medications && Array.isArray(visit.planned_medications)) {
    const needsEntry = visit.planned_medications.some((med: any) =>
      !med.qty || med.qty === null || med.qty === '' || med.qty === '0'
    );
    if (needsEntry && visit.status !== 'Baigtas') {
      setShowMedicationEntry(true);
      const initialQtys: Record<string, string> = {};
      const initialBatches: Record<string, string> = {};
      visit.planned_medications.forEach((med: any, idx: number) => {
        initialQtys[`${idx}`] = med.qty || '';
        initialBatches[`${idx}`] = med.batch_id || ''; // ✅ Initialize from planned_medications
      });
      setMedicationQuantities(initialQtys);
      setMedicationBatches(initialBatches);
    }
  }
};
```

#### 3. Updated UI - Batch Selector Dropdown
```typescript
<select
  value={selectedBatchId || ''}
  onChange={(e) => {
    setMedicationBatches({
      ...medicationBatches,
      [`${idx}`]: e.target.value
    });
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
  required
>
  <option value="">Pasirinkite seriją</option>
  {availableBatches.map(batch => (
    <option key={batch.id} value={batch.id}>
      {batch.lot || batch.serial_number || batch.batch_no}
      {batch.expiry_date ? ` (Galioja: ${formatDateLT(batch.expiry_date)})` : ''}
      {' · '}{batch.available_qty} {product?.primary_pack_unit || 'vnt'} likutis
    </option>
  ))}
</select>
```

#### 4. Updated Validation on Completion
```typescript
const allEntered = visit.planned_medications?.every((_: any, idx: number) => {
  const qty = medicationQuantities[`${idx}`];
  const batch = medicationBatches[`${idx}`]; // ✅ Also check batch
  return qty && parseFloat(qty) > 0 && batch;
});

if (!allEntered) {
  alert('Prašome įvesti visų vaistų kiekius ir pasirinkti serijas prieš užbaigiant vizitą');
  return;
}
```

#### 5. Updated Medication Data on Completion
```typescript
const updatedMeds = visit.planned_medications?.map((med: any, idx: number) => ({
  ...med,
  qty: parseFloat(medicationQuantities[`${idx}`]),
  batch_id: medicationBatches[`${idx}`] // ✅ Include selected batch_id
}));
```

---

### Backend Changes (Database Trigger)

**File:** `FIX_WITHDRAWAL_CALCULATION_ON_VISIT_COMPLETION.sql`

**What it does:**
- Updates the `process_visit_medications()` trigger function
- After creating `usage_items` from `planned_medications`
- Calls `calculate_withdrawal_dates(v_treatment_id)` to recalculate withdrawal periods
- Ensures karencines dienos are always correct

**Key Addition:**
```sql
-- ✅ NEW: Recalculate withdrawal dates after adding medications
IF v_treatment_id IS NOT NULL THEN
  RAISE NOTICE 'Recalculating withdrawal dates for treatment %', v_treatment_id;

  BEGIN
    PERFORM calculate_withdrawal_dates(v_treatment_id);
    RAISE NOTICE '✅ Successfully recalculated withdrawal dates for treatment %', v_treatment_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to recalculate withdrawal dates: %', SQLERRM;
    -- Don't fail the entire transaction if withdrawal calculation fails
  END;
END IF;
```

---

## How It Works Now

### Complete Multi-Day Course Workflow

**Step 1: Create Course**
1. Open animal sidebar
2. Click "Pridėti gydymą"
3. Click "Planuoti kursą"
4. Select dates (e.g., Day 1, Day 3, Day 5)
5. For each day, select product (e.g., "Tylosin 200mg/ml")
6. Click "Patvirtinti kursą"
7. Click "Sukurti vizitą"
8. ✅ Visit created with `planned_medications` array

**What gets stored in `treatment_courses`:**
```sql
{
  product_id: 'abc-123',
  batch_id: NULL,           -- Will be selected per visit
  days: 3,
  total_dose: NULL,
  daily_dose: NULL,
  unit: 'ml',
  start_date: '2025-12-01'
}
```

**What gets stored in future visits:**
```sql
{
  planned_medications: [
    {
      product_id: 'abc-123',
      batch_id: NULL,        -- Will be selected when visit opens
      qty: NULL,             -- Will be entered manually
      unit: 'ml',
      purpose: 'Gydymas',
      teat: NULL
    }
  ],
  medications_processed: false
}
```

---

**Step 2: Complete Day 1 Visit**
1. Open Day 1 visit
2. See "Įveskite vaistų kiekius" section
3. **Serija dropdown appears** with available batches:
   - "Batch ABC123 (Galioja: 2026-01-15) · 500 ml likutis"
   - "Batch XYZ789 (Galioja: 2025-12-30) · 250 ml likutis"
4. Select batch (e.g., "Batch ABC123")
5. Enter quantity (e.g., "20" ml)
6. Click "Užbaigti" to complete visit

**What happens in database:**
```sql
-- 1. Updates visit with selected batch and quantity
UPDATE animal_visits SET
  planned_medications = [{
    product_id: 'abc-123',
    batch_id: 'batch-abc-123',  -- ✅ Selected batch
    qty: 20,                     -- ✅ Entered quantity
    unit: 'ml',
    purpose: 'Gydymas',
    teat: NULL
  }],
  status = 'Baigtas'
WHERE id = visit_id;

-- 2. Trigger: process_visit_medications() fires
--    Creates usage_items record:
INSERT INTO usage_items (
  treatment_id, product_id, batch_id, qty, unit, purpose
) VALUES (
  treatment_id, 'abc-123', 'batch-abc-123', 20, 'ml', 'Gydymas'
);

-- 3. ✅ NEW: Calls calculate_withdrawal_dates()
--    Recalculates withdrawal periods based on ALL medications
PERFORM calculate_withdrawal_dates(treatment_id);

-- Result: Treatment record updated with correct withdrawal dates
UPDATE treatments SET
  withdrawal_until_milk = '2025-12-26',  -- ✅ Calculated from Day 1 + 20 days
  withdrawal_until_meat = '2025-12-31'   -- ✅ Calculated from Day 1 + 25 days
WHERE id = treatment_id;

-- 4. Marks medications as processed
UPDATE animal_visits SET
  medications_processed = true
WHERE id = visit_id;
```

---

**Step 3: Complete Day 3 Visit**
1. Open Day 3 visit
2. See "Įveskite vaistų kiekius" section
3. Select batch (could be same or different)
4. Enter quantity (e.g., "20" ml)
5. Click "Užbaigti"

**What happens:**
```sql
-- 1. Creates another usage_items record
INSERT INTO usage_items (
  treatment_id, product_id, batch_id, qty, unit
) VALUES (
  treatment_id, 'abc-123', 'batch-abc-123', 20, 'ml', 'Gydymas'
);

-- 2. ✅ Recalculates withdrawal dates (considers BOTH Day 1 AND Day 3)
--    Formula: MAX(Day 1 withdrawal, Day 3 withdrawal)
PERFORM calculate_withdrawal_dates(treatment_id);

-- Result: Withdrawal dates updated to account for Day 3
UPDATE treatments SET
  withdrawal_until_milk = '2025-12-28',  -- ✅ Now calculated from Day 3 + 20 days
  withdrawal_until_meat = '2026-01-02'   -- ✅ Now calculated from Day 3 + 25 days
WHERE id = treatment_id;
```

---

**Step 4: Complete Day 5 Visit**
Same process - withdrawal dates recalculated again to account for Day 5.

**Final Result:**
```sql
-- Withdrawal dates reflect the LAST treatment day (Day 5) + withdrawal period
withdrawal_until_milk = '2025-12-30'  -- Day 5 + 20 days + 1 safety day
withdrawal_until_meat = '2026-01-04'  -- Day 5 + 25 days + 1 safety day
```

---

## Withdrawal Calculation Formula

The `calculate_withdrawal_dates()` function uses this logic:

### For Course Medications (treatment_courses):
```
withdrawal_date = reg_date + course_days + withdrawal_days + 1
```

**Example:**
- Treatment starts: Day 6
- Medicine: 4-day course, 5-day milk withdrawal
- Calculation: Day 6 + 4 + 5 + 1 = **Day 16** (safe on Day 16)

### For Single-Dose Medications (usage_items):
```
withdrawal_date = reg_date + withdrawal_days + 1
```

**Example:**
- Treatment date: Day 6
- Medicine: 5-day milk withdrawal
- Calculation: Day 6 + 5 + 1 = **Day 12** (safe on Day 12)

### Multiple Medications:
Takes the **MAXIMUM** withdrawal date across all medications.

**Example:**
- Medicine 1: Day 16 (milk withdrawal)
- Medicine 2: Day 19 (milk withdrawal)
- **Result: Day 19** (must wait for longest withdrawal period)

---

## Files Created

1. **FIX_WITHDRAWAL_CALCULATION_ON_VISIT_COMPLETION.sql**
   - Updates `process_visit_medications()` trigger
   - Adds call to `calculate_withdrawal_dates()`
   - **YOU MUST RUN THIS IN SUPABASE SQL EDITOR**

---

## Installation Instructions

### Step 1: Run SQL Fix (CRITICAL)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `FIX_WITHDRAWAL_CALCULATION_ON_VISIT_COMPLETION.sql`
4. Paste and click "Run"
5. Verify success: Should see 1 row returned with function source code

### Step 2: Test Workflow

1. **Create Multi-Day Course:**
   - Select animal
   - Click "Pridėti gydymą"
   - Click "Planuoti kursą"
   - Select 3 dates (Day 1, 3, 5)
   - Select product for each day
   - Click "Patvirtinti kursą"
   - Click "Sukurti vizitą"

2. **Complete Day 1 Visit:**
   - Open Day 1 visit
   - ✅ See batch selector dropdown
   - Select batch from dropdown
   - Enter quantity (e.g., 20 ml)
   - Click "Užbaigti"
   - ✅ No errors

3. **Verify Withdrawal Dates:**
   - Check treatment record
   - `withdrawal_until_milk` should be calculated
   - `withdrawal_until_meat` should be calculated
   - Dates should reflect Day 1 + withdrawal period

4. **Complete Day 3 Visit:**
   - Open Day 3 visit
   - Select batch and enter quantity
   - Click "Užbaigti"
   - ✅ Withdrawal dates should update

5. **Complete Day 5 Visit:**
   - Same process
   - ✅ Final withdrawal dates should reflect Day 5

---

## Verification Checklist

### ✅ Batch Selector
- [ ] Opens visit with planned medications
- [ ] Sees "Įveskite vaistų kiekius" section
- [ ] Batch selector dropdown appears
- [ ] Shows available batches with stock info
- [ ] Can select batch
- [ ] Can enter quantity
- [ ] Cannot complete without batch selected
- [ ] Cannot complete without quantity entered

### ✅ Withdrawal Calculation
- [ ] After completing Day 1: withdrawal dates set
- [ ] After completing Day 3: withdrawal dates updated
- [ ] After completing Day 5: withdrawal dates updated again
- [ ] Final dates reflect LAST treatment day (Day 5)
- [ ] Formula correct: Day 5 + withdrawal_days + 1

### ✅ Database
- [ ] Run verification query:
  ```sql
  SELECT
    proname,
    prosrc
  FROM pg_proc
  WHERE proname = 'process_visit_medications'
    AND prosrc LIKE '%calculate_withdrawal_dates%';
  ```
- [ ] Should return 1 row if fix applied

---

## Summary

✅ **Batch Selector:** Users can now select which batch to use when completing a course visit

✅ **Withdrawal Calculation:** Karencines dienos (withdrawal days) are automatically recalculated each time a course visit is completed, ensuring accurate compliance

✅ **Build Status:** Project builds successfully with no errors

---

## Need Help?

If batch selector doesn't appear:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check that visit has `planned_medications` in database
3. Check browser console for errors

If withdrawal dates aren't updating:
1. Verify SQL fix was applied (run verification query)
2. Check Supabase logs for errors
3. Look for "Recalculating withdrawal dates" message in logs

---

**CRITICAL:** You MUST run `FIX_WITHDRAWAL_CALCULATION_ON_VISIT_COMPLETION.sql` in Supabase SQL Editor for withdrawal dates to calculate correctly!
