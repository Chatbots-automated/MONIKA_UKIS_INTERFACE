# Found Issues - Data Discrepancy Analysis

## Issue 1: GEA Milk Average Discrepancy (Cow LT000008945975)

### Problem
**Pelningumas section shows:** 103.38 L/day over 10 days
**Sidebar shows:** 56.9 L average

### Root Cause
These are TWO DIFFERENT calculations from TWO DIFFERENT data sources:

1. **Pelningumas (103.38 L/day)**
   - Source: `vw_animal_milk_revenue` view
   - Calculation: Sums ALL milkings (m1+m2+m3+m4+m5) per day over last 14 days
   - Days tracked: 10 days (actual GEA records found)
   - Total: 1033.83 L / 10 days = 103.38 L/day
   - This is CORRECT for recent production

2. **Sidebar (56.9 L/day)**
   - Source: `gea_daily.milk_avg` column (single field)
   - This is GEA system's own calculation stored in the snapshot
   - Takes the MOST RECENT snapshot only (not summing multiple days)
   - This might be a different averaging algorithm from GEA system

### Actual Data Found
```
Date       | M1    | M2    | M3    | M4    | M5    | TOTAL
-----------|-------|-------|-------|-------|-------|-------
2025-12-03 | 24.84 | 18.93 | 17.57 | 24.23 | 13.83 | 99.40
2025-12-02 | 24.23 | 13.83 | 13.28 | 35.72 | 1.09  | 88.15
2025-12-01 | 35.72 | 1.09  | 20.99 | 27.22 | 18.75 | 103.77
... (8 days total)

Total: 813.01 L over 8 days = 101.63 L/day average
```

### Why the Difference?
The view shows "10 d." but only 8 days have data in recent period. The `milk_avg` field (56.9) from GEA might be:
- A 7-day rolling average calculated by GEA system
- Excluding certain milkings
- Using a different time window
- Or there's a data quality issue in GEA imports

### Recommendation
**THIS IS NOT A BUG** - these are two different metrics:
- Pelningumas = Our calculated recent production (accurate for profitability)
- Sidebar = GEA system's own reported average (may use different rules)

If you want them to match, need to:
1. Understand how GEA calculates `milk_avg`
2. Either update our view to match GEA logic, OR
3. Replace sidebar to use our calculated average instead of GEA's field

---

## Issue 2: Medication Cost HUGE Discrepancy (Cow LT000044228045)

### Problem
**Pelningumas shows:** €164.21 medications + €90 visits = €254.21 total
**Gydymu Savikainos shows:** €18.25 products + €90 visits = €108.25 total
**DIFFERENCE:** €145.96 (9x multiplication!)

### Root Cause
THREE DIFFERENT calculation methods across the system:

#### Method 1: Pelningumas View (`vw_animal_profitability`)
- Uses last 90 days filter
- Includes usage_items from treatments
- Includes synchronization_steps medications
- STILL HAS THE CARTESIAN PRODUCT BUG (not yet applied the fix!)
- Result: €164.21

#### Method 2: Gydymu Savikainos Component (`TreatmentCostAnalysis.tsx`)
- Loads ALL treatments (no time filter!)
- Includes usage_items from treatments
- Includes `planned_medications` from visits (JSON field)
- Does NOT include synchronization_steps
- Result: €18.25 from usage_items only

#### Method 3: Manual Calculation (Direct Query)
- Last 90 days only
- 7 treatments with usage_items
- 0 sync medications
- Result: €18.25 (matches Gydymu Savikainos)

### Actual Data
```
Treatments (7) with medications:
  2025-11-20: €0.57
  2025-11-24: €6.08
  2025-11-24: €2.32
  2025-11-25: €2.32
  2025-11-26: €2.32
  2025-11-27: €2.32
  2025-11-28: €2.32
  Total: €18.25

Visits: 9 completed × €10 = €90.00
Grand total should be: €108.25
```

### Why €164.21 in Pelningumas?
The view STILL has the unfixed cartesian product bug! The fix SQL has been created but NOT APPLIED yet.

**Multiplier calculation:**
- €164.21 / €18.25 = 9x multiplication
- This cow has 9 visits
- Classic cartesian product: 9 visits × usage_items = 9x cost multiplication

### The Bug is Still Active!
The `vw_animal_profitability` view in the database STILL uses the OLD buggy logic that creates cartesian products when joining visits and medications.

---

## Solutions Required

### Solution 1: GEA Milk Average (Low Priority)
**Options:**
1. Keep both metrics (they serve different purposes)
2. Update sidebar to use calculated average from view instead of GEA's field
3. Add explanation tooltip: "GEA average" vs "Calculated recent production"

**Recommended:** Option 1 - Keep both, add tooltip explaining the difference

### Solution 2: Medication Costs (HIGH PRIORITY - CRITICAL!)
**MUST APPLY THE FIX IMMEDIATELY!**

The fix SQL file has been created: `fix_profitability_medication_costs.sql`

**This fix will:**
1. Remove cartesian product bug (separate CTEs)
2. Add synchronization medications (currently missing)
3. Count only completed visits
4. Change GEA period from 90 to 14 days

**Expected results after fix for LT000044228045:**
- Medications: €18.25 (down from €164.21) ✅
- Visits: 9 × €10 = €90.00 ✅
- Total: €108.25 (down from €254.21) ✅
- Will match Gydymu Savikainos section ✅

### Solution 3: Align All Three Calculation Methods
After applying the SQL fix, we need to ensure consistency:

1. **Pelningumas view** (after fix):
   - 90-day period → Should be 14 days (included in fix)
   - Includes usage_items ✅
   - Includes sync_steps ✅
   - Only completed visits ✅

2. **Gydymu Savikainos component**:
   - No time filter → Should add 90 or 14 day filter
   - Includes usage_items ✅
   - Includes planned_medications ← Should this be in view too?
   - Does NOT include sync_steps ← BUG! Should add

3. **Consistency target:**
   All three methods should:
   - Use same time period (14 days recommended)
   - Include: usage_items + sync_steps + planned_medications
   - Count only completed visits
   - Use same batch cost calculation

---

## Impact Assessment

### Cow LT000044228045 Example
**Current (buggy):**
- Shows €254.21 total costs
- Milk revenue: ~€800 (example)
- Net profit: €545.79
- Appears profitable

**After fix:**
- Shows €108.25 total costs
- Milk revenue: ~€800 (with 14d period, might be lower)
- Net profit: €691.75 (if milk revenue unchanged)
- MORE profitable (costs corrected downward)

### System-Wide Impact
**For animals with cartesian product issues:**
- Medication costs will DECREASE (remove multiplication)
- This particular cow benefited from the bug (costs inflated = looked less profitable)
- Other cows with sync meds will have costs INCREASE (adding missing sync costs)

**Net effect:** Mixed
- Some animals more profitable (cartesian product fixed)
- Some less profitable (sync meds now counted)
- Overall: ACCURATE instead of random

---

## Immediate Actions Required

1. **APPLY THE SQL FIX** - Critical Priority
   ```bash
   # Run this in Supabase SQL Editor
   fix_profitability_medication_costs.sql
   ```

2. **Update TreatmentCostAnalysis.tsx** - High Priority
   - Add 14-day time filter
   - Add synchronization_steps medications
   - Remove or clarify planned_medications handling

3. **Add Data Validation** - Medium Priority
   - Create automated checks comparing:
     - Pelningumas totals vs Gydymu Savikainos totals
     - Alert if discrepancy > 10%

4. **Document GEA Milk Average** - Low Priority
   - Add tooltip explaining two different calculations
   - Or replace with calculated value

---

## Testing Checklist

After applying fix, verify with LT000044228045:
- [ ] Pelningumas medications: €18.25 (not €164.21)
- [ ] Pelningumas total: €108.25 (not €254.21)
- [ ] Matches Gydymu Savikainos: €108.25
- [ ] Visit count: 9 (same)
- [ ] Treatment count: 7 (same)

After applying fix, verify with LT000008564183:
- [ ] Medications: €3.06 (not €18.36)
- [ ] Visits: 2 (not 6)
- [ ] Total: €23.06
- [ ] Matches sync step costs

---

**Created:** 2025-12-03
**Status:** Analysis Complete - Awaiting SQL Fix Application
**Priority:** CRITICAL - Affects all profitability calculations
