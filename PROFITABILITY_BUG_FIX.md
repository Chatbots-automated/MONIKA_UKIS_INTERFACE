# Pelningumas (Profitability) Bug Fix - CRITICAL

## 🐛 Problems Identified

### Problem 1: Missing Synchronization Medication Costs

**Symptom:**
Cow LT000008564183 shows **Medikamentų: 18,36 €** but should be **€3.06**

**Root Cause - TWO BUGS:**

1. **Missing sync medications:** The view only counted `usage_items` (regular treatments) but ignored `synchronization_steps` (sync medications)

2. **CARTESIAN PRODUCT BUG:** When joining both `animal_visits` AND `synchronization_steps` to the same animal:
   - Animal has 6 visits
   - Animal has 6 sync steps
   - JOIN creates 6 × 6 = 36 rows
   - SUM() counts each medication **6 times**
   - Actual cost: €3.06
   - Reported cost: €18.36 (6x multiplication!)

**Database structure:**
- Regular treatment meds: `treatments` → `usage_items` → `batches`
- Sync meds: `animal_synchronizations` → `synchronization_steps` → `batches`

### Problem 2: GEA Milk Data Using Wrong Time Period

**Symptom:**
- Pelningumas shows "14 d." but calculates average over 90 days
- Results in inflated milk production averages
- Example: Shows 114.47 L/day but recent production is ~67 L/day

**Root Cause:**
The `vw_animal_milk_revenue` view filters GEA data for last 90 days, then counts how many records exist (`days_tracked`). If only 14 days have data, it shows "14 d." but the average includes all 90 days worth of data (including older, higher-production periods).

## ✅ Fixes Applied

### Fix 1: Separate CTEs to Prevent Cartesian Product

**Solution:** Calculate treatment costs and sync costs in **SEPARATE CTEs**, then combine them.

```sql
WITH treatment_costs AS (
  -- Calculate treatment medications + visit counts
  -- (Safe: visits don't multiply with usage_items)
  ...
),
sync_costs AS (
  -- Calculate sync medications SEPARATELY
  -- (No visits joined here = no multiplication)
  ...
),
combined_costs AS (
  -- LEFT JOIN the two CTEs
  -- (No cartesian product possible)
  ...
)
```

**Key changes:**
1. Split into 3 CTEs instead of 1 big GROUP BY
2. Treatment costs CTE handles visits and usage_items
3. Sync costs CTE handles synchronization_steps **separately**
4. Combined CTE merges results via LEFT JOIN (safe)

### Fix 2: GEA Milk Period Changed from 90 to 14 Days

**Changed:**
```sql
-- OLD:
WHERE gd.snapshot_date >= CURRENT_DATE - INTERVAL '90 days'

-- NEW:
WHERE gd.snapshot_date >= CURRENT_DATE - INTERVAL '14 days'
```

**Impact:**
- Milk averages now reflect recent (last 14 days) production
- "Stebėta dienų: 14 d." will match actual calculation period
- More accurate representation of current milk output

## 🚀 How to Apply the Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor
2. Click "SQL Editor"
3. Open file: `fix_profitability_medication_costs.sql`
4. Copy ALL contents (includes both fixes)
5. Paste into SQL Editor
6. Click "Run" or press Ctrl+Enter

### Option 2: With Database Password

```bash
DB_PASSWORD=your_password_here node apply_profitability_fix.js
```

## ✔️ Testing the Fix

Test with cow **LT000008564183**:

### Expected Results:

**Before fix:**
```
Gydymo Kaštai:
- Medikamentų: 18,36 €    ← WRONG (6x multiplication)
- Apsilankymų: 6          ← Includes planned visits
- Viso: 78,36 €           ← Inflated

Pieno Gamyba:
- Vidutiniškai: 114.47 L  ← 90-day average
```

**After fix:**
```
Gydymo Kaštai:
- Medikamentų: 3,06 €     ← CORRECT (1 sync step)
- Apsilankymų: 2          ← Only completed visits
- Viso: 23,06 €           ← Correct (€20 visits + €3.06 meds)

Pieno Gamyba:
- Vidutiniškai: ~67 L     ← 14-day average (recent production)
```

### Verification Steps:

1. **Refresh Pelningumas page**
2. **Click on cow LT000008564183**
3. **Check medication costs:**
   - Should be €3.06 (not €18.36)
   - Should match 1 completed sync step with 6 ml Enzaprost
4. **Check milk production:**
   - Should show recent 14-day average (~67 L/day)
   - Should match GEA Duomenys sidebar values

## 📊 What Changed in the Database

### Views Updated:
1. `vw_animal_profitability` - Fixed cartesian product, added sync costs
2. `vw_animal_milk_revenue` - Changed from 90 to 14 days

### Tables Affected:
None - view-only changes, no data modified

### Performance Impact:
- Slightly better (fewer rows to process with 14d vs 90d)
- Separate CTEs may be marginally slower but necessary for correctness

## 🔍 Technical Details

### The Cartesian Product Problem

**What happened:**
```sql
-- This creates a cartesian product:
FROM animals a
LEFT JOIN animal_visits av ON av.animal_id = a.id  -- 6 visits
LEFT JOIN synchronization_steps ss ON ss.sync.animal_id = a.id  -- 6 steps
-- Result: 6 × 6 = 36 rows per animal!
```

**When summing:**
```sql
SUM(ss.dosage * batch.price)
-- Counts €3.06 medication cost 6 times = €18.36
```

**The fix:**
```sql
-- Calculate separately:
WITH sync_costs AS (
  SELECT animal_id, SUM(dosage * price) FROM sync_steps ...
),
treatment_costs AS (
  SELECT animal_id, ... FROM visits ...
)
-- Then JOIN the CTEs (not the raw tables)
SELECT * FROM treatment_costs LEFT JOIN sync_costs USING (animal_id)
```

### Why 14 Days for GEA Data?

- Milk production changes daily based on feed, health, lactation stage
- 90-day averages hide recent changes (illness, treatment effects)
- 14 days provides recent, actionable insight
- Matches typical veterinary monitoring periods
- Still shows trends but reflects current state

## 🎯 Impact

### Who is affected:
- **All animals** with synchronization protocols
- **All animals** with visit-based medications
- **All milk production** calculations now use 14-day window

### What improves:
- ✅ Accurate medication costs (no multiplication)
- ✅ Sync medication costs now included
- ✅ Visit counts correct (only completed)
- ✅ Milk averages reflect recent production
- ✅ Better treatment ROI decisions

### What to watch:
- Some animals' profitability will **change significantly**:
  - Lower medication costs (no 6x multiplier)
  - Lower milk revenue (14d vs 90d period)
  - This reveals **true current state**, not inflated averages
- Animals previously "profitable" might now be "at risk" (if recent production dropped)
- This is CORRECT - shows current reality for better decisions

## 📝 Examples

### Example 1: Cartesian Product Bug
```
Cow with:
- 6 visits (4 planned, 2 completed)
- 1 sync with 6 steps (1 completed with €3.06 med)

BEFORE FIX:
- Joins create 36 rows
- Medication cost: €3.06 × 6 = €18.36 ❌
- Visit count: 6 (includes planned) ❌

AFTER FIX:
- Separate CTEs, no multiplication
- Medication cost: €3.06 ✅
- Visit count: 2 (only completed) ✅
```

### Example 2: GEA Milk Period
```
Cow producing:
- Days 1-14: 67 L/day (recent, lower)
- Days 15-90: 95 L/day (historical, higher)

BEFORE FIX (90 days):
- Average: ~90 L/day (misleading)

AFTER FIX (14 days):
- Average: ~67 L/day (accurate current state)
```

## ❓ FAQ

**Q: Why were medication costs multiplied by 6?**
A: Cartesian product from joining 6 visits with 6 sync steps created 36 rows. Each row included the same €3.06 cost, so SUM counted it 6 times.

**Q: Why change from 90 to 14 days for milk?**
A: 90 days includes historical data that doesn't reflect current production. 14 days shows recent, actionable trends for treatment decisions.

**Q: Will this affect my historical data?**
A: No data is changed. Only the calculation/display logic is fixed. You're now seeing accurate current numbers instead of inflated averages.

**Q: Some animals show lower profitability now?**
A: Yes - because costs were underreported (0 meds) and revenue was overreported (90d avg). The new numbers are CORRECT.

**Q: Should I re-evaluate treatment decisions?**
A: Yes - use the corrected numbers for treat vs cull decisions. Some animals may be less profitable than you thought.

**Q: Can I change back to 90 days?**
A: Yes, but 14 days is more accurate for current decisions. If you need long-term trends, we can add a separate view or make it configurable.

---

**Applied:** 2025-12-03
**Version:** 2.0 (Corrected after finding cartesian product bug)
**Status:** Ready to deploy
**Critical:** YES - Affects all profitability calculations
