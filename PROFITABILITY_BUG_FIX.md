# Pelningumas (Profitability) Bug Fix

## 🐛 Problems Identified

### Problem 1: Missing Medication Costs from Synchronization Visits

**Symptom:**
When viewing cow LT000008564183 in Pelningumas section:
- Shows: **Medikamentų: 0,00 €**
- Shows: **Apsilankymų: 6**
- Shows: **Viso: 60,00 €** (only visit costs: 6 × €10)

But the animal actually has:
- 2 completed synchronization visits
- Used Enzaprost (€0.31-0.41 per use)
- Used Ovarelin (has cost)

**Root Cause:**
The `vw_animal_profitability` view only counted medications linked to `treatments` table via `usage_items.treatment_id`, but **completely ignored** medications linked to visits via `usage_items.visit_id`.

Synchronization medications are recorded as visits, not treatments, so their costs were missing.

### Problem 2: GEA Milk Data Discrepancy

**Symptom:**
- **Pelningumas section:** Shows 114.55 L average per day over 14 days
- **GEA Duomenys sidebar:** Shows 67.1 L average

**Root Cause:**
The `vw_animal_milk_revenue` view calculates over **90 days** period (hardcoded in SQL), but the UI displays `days_tracked` which can be any number (14, 30, etc.) depending on available data. The longer period inflates the average by including historical high-production days.

Recent milkings show:
- 2025-12-03: 27.56 L
- 2025-12-02: 18.27 L + 18.76 L + 28.35 L
- 2025-12-01: 18.91 L

Daily total ~67 L is more accurate for recent production.

## ✅ Fixes Applied

### Fix 1: Include Visit Medications in Cost Calculation

**Changes to `vw_animal_profitability` view:**

1. **Updated medication cost calculation** to include BOTH:
   ```sql
   -- OLD (only treatment medications):
   LEFT JOIN usage_items ui ON ui.treatment_id = t.id

   -- NEW (both treatment AND visit medications):
   LEFT JOIN usage_items ui ON (ui.treatment_id = t.id OR ui.visit_id = av.id)
   ```

2. **Only count completed visits:**
   ```sql
   -- Only count visits with status = 'Baigtas'
   COUNT(DISTINCT CASE WHEN av.status = 'Baigtas' THEN av.id END)
   ```

3. **Separate cost calculation** for treatment vs visit medications:
   ```sql
   -- Costs from treatment medications
   SUM(CASE WHEN ui.treatment_id IS NOT NULL THEN ... END) +
   -- Costs from visit medications (only completed)
   SUM(CASE WHEN ui.visit_id IS NOT NULL AND av_med.status = 'Baigtas' THEN ... END)
   ```

### Fix 2: GEA Milk Data Calculation

**Status:** NOT YET FIXED - Needs further investigation

**Options to consider:**
1. Make the time period configurable (14d, 30d, 90d selector)
2. Show both: "Recent average" (14d) vs "Long-term average" (90d)
3. Change default period from 90d to 30d or 14d
4. Add date range labels to clarify what's being calculated

## 🚀 How to Apply the Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor
2. Click "SQL Editor"
3. Open file: `fix_profitability_medication_costs.sql`
4. Copy ALL contents
5. Paste into SQL Editor
6. Click "Run" or press Ctrl+Enter

### Option 2: With Database Password

```bash
DB_PASSWORD=your_password_here node apply_profitability_fix.js
```

## ✔️ Testing the Fix

After applying the fix, test with cow **LT000008564183**:

### Expected Results:

**Before fix:**
```
Gydymo Kaštai:
- Gydymų skaičius: 0
- Vakcinacijų: 0
- Apsilankymų: 6
- Medikamentų: 0,00 €    ← WRONG
- Viso: 60,00 €          ← Missing medication costs
```

**After fix:**
```
Gydymo Kaštai:
- Gydymų skaičius: 0
- Vakcinacijų: 0
- Apsilankymų: 2          ← Only completed visits
- Medikamentų: ~€0.62+    ← Now shows sync medication costs!
- Viso: ~€20.62+          ← Correct total
```

### Verification Steps:

1. **Refresh Pelningumas page** in your browser
2. **Click on cow LT000008564183**
3. **Check the "Medikamentų" line** - should now show cost (not 0,00 €)
4. **Verify the total** includes medication costs
5. **Cross-reference** with Vaistų Panaudojimas section:
   - Search for "Enzaprost 5mg/ml inj.tirp.50ml N1"
   - Find usages for this cow
   - Costs should match

## 📊 What Changed in the Database

### View Updated:
- `vw_animal_profitability` - Medication cost calculation logic

### Tables Affected:
None - this is a view-only change, no data modified

### Performance Impact:
Minimal - added one additional LEFT JOIN to animal_visits for status checking

## 🔍 Technical Details

### Join Logic Change:

**OLD:**
```sql
LEFT JOIN usage_items ui ON ui.treatment_id = t.id
```
Only counted medications where `treatment_id` was set.

**NEW:**
```sql
LEFT JOIN usage_items ui ON (ui.treatment_id = t.id OR ui.visit_id = av.id)
LEFT JOIN animal_visits av_med ON av_med.id = ui.visit_id
```
Counts medications where EITHER `treatment_id` OR `visit_id` is set, and checks visit status.

### Cost Calculation Logic:

```sql
COALESCE(
  -- Treatment medications
  SUM(CASE
    WHEN ui.treatment_id IS NOT NULL THEN
      ui.qty * b.purchase_price / NULLIF(b.received_qty, 0)
    ELSE 0
  END) +
  -- Visit medications (only completed visits)
  SUM(CASE
    WHEN ui.visit_id IS NOT NULL AND av_med.status = 'Baigtas' THEN
      ui.qty * b.purchase_price / NULLIF(b.received_qty, 0)
    ELSE 0
  END),
  0
) as medication_costs
```

This ensures:
- Treatment medications are counted
- Visit medications are counted (if visit is completed)
- Planned visit medications are NOT counted
- NULL values don't break the calculation

## 🎯 Impact

### Who is affected:
- **All animals** with synchronization visits
- **All animals** with visit-based medications (not just treatments)

### What improves:
- ✅ Accurate profitability calculations
- ✅ Correct treatment cost reporting
- ✅ Proper visit cost counting (only completed)
- ✅ Medication costs match usage reports

### What to watch:
- Some animals' profitability may **decrease** (because costs were underreported)
- This is CORRECT - it reveals true costs that were hidden before
- Animals previously showing as "profitable" might now show as "at risk"

## 📝 Future Improvements

1. **GEA Milk Period Selection**
   - Add UI toggle: 14d / 30d / 90d
   - Show both recent and historical averages

2. **Detailed Cost Breakdown**
   - Show per-visit costs
   - List medications used
   - Include batch and pricing info

3. **Cost Validation Report**
   - Compare profitability costs with Vaistų Panaudojimas
   - Highlight discrepancies
   - Export validation data

## ❓ FAQ

**Q: Why were my costs showing as 0,00 €?**
A: The system only looked at treatments table, not visits. Synchronization medications are recorded as visits.

**Q: Will this change my historical data?**
A: No, it only changes HOW data is calculated/displayed. The raw data is unchanged.

**Q: Why do I now see different profitability numbers?**
A: Because the costs are now ACCURATE. Previous numbers underreported costs.

**Q: Should I adjust my business decisions?**
A: Yes - use the corrected numbers for treat vs cull decisions. Some animals are less profitable than previously thought.

**Q: What about the GEA milk discrepancy?**
A: Still under investigation. The 90-day calculation may be inflating averages. Will fix in next update.

---

**Applied:** 2025-12-03
**Version:** 1.0
**Status:** Ready to deploy
