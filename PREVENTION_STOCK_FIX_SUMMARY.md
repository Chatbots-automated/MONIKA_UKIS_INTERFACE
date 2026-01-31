# Prevention (Profilaktika) Stock Deduction - Fix

## Problem Confirmed

When adding prevention products through **Animal Sidepanel → New Visit → Profilaktika → Add Product**, stock is **NOT being deducted**.

### Evidence
Testing with a sample batch revealed:
- **8 prevention items** saved to `biocide_usage` table
- **Only 2 of those items** created corresponding `usage_items` entries
- **6 prevention items** (75%) are **NOT deducting from stock**

```
BEFORE FIX:
  ❌ biocide_usage records: 8 items
  ❌ usage_items records: 2 items (only 25% synced!)
  ❌ Missing stock deduction: 6 prevention items
```

## Root Cause

The system tracks all stock usage in the `usage_items` table:
- **Treatments (Gydymas)**: Saved directly to `usage_items` ✅
- **Vaccinations (Vakcina)**: Trigger auto-creates `usage_items` ✅
- **Prevention (Profilaktika)**: Saved to `biocide_usage` but **NO trigger** ❌

### Why This Happens
1. Visit form saves prevention products to `biocide_usage` table
2. Stock is calculated **only** from `usage_items` table
3. The `usage_items` table has a constraint requiring entries to be linked to either `treatment_id` OR `vaccination_id`
4. Prevention products are neither, so they couldn't be added to `usage_items`
5. Result: Prevention items are recorded but don't reduce stock

### Technical Constraint Issue
The `usage_items` table had a check constraint:
```sql
CHECK (
  (treatment_id IS NOT NULL AND vaccination_id IS NULL) OR
  (treatment_id IS NULL AND vaccination_id IS NOT NULL)
)
```
This prevented any records that weren't linked to treatments or vaccinations.

## The Fix

**File**: `fix-prevention-stock-deduction.sql`

### What It Does

1. **Adds biocide_usage_id column** to `usage_items` table
   - Creates new foreign key linking to `biocide_usage` records
   - Allows prevention products to be tracked in stock system

2. **Updates the constraint** on `usage_items`
   - Changes from requiring treatment OR vaccination
   - Now allows treatment OR vaccination OR biocide_usage
   - Maintains data integrity with three valid sources

3. **Creates a trigger** on `biocide_usage` table
   - Automatically creates `usage_items` entry when prevention product is used
   - Links via the new `biocide_usage_id` column
   - Matches the pattern used for vaccinations (proven approach)

4. **Backfills historical data** (with safety measures)
   - Processes all existing `biocide_usage` records
   - Temporarily disables stock validation during backfill
   - Creates missing `usage_items` entries
   - Prevents duplicates by checking for existing biocide_usage_id link
   - Preserves original timestamps
   - Re-enables stock validation after completion

5. **Ensures consistency**
   - Prevention items now work exactly like treatments and vaccinations
   - Stock deduction is automatic and reliable
   - No frontend changes needed

### Important Note About Backfill
Because historical prevention products were already used but stock was never deducted, some batch quantities may show as negative after the backfill. This accurately reflects that the products were consumed but not previously tracked.

## How to Apply

### Step 1: Apply the SQL
1. Open Supabase SQL Editor
2. Copy contents of `fix-prevention-stock-deduction.sql`
3. Paste and click **Run**

### Step 2: Verify It Worked
```bash
node test-prevention-stock-deduction.cjs
```

Expected output after fix:
```
✅✅✅ PREVENTION STOCK DEDUCTION IS WORKING!
All prevention items are creating usage_items and deducting from stock.
```

## What Gets Fixed

### Before Fix ❌
- Prevention products saved but stock unchanged
- Inventory shows wrong quantities
- Can't track actual product usage
- Inconsistent with treatments/vaccinations

### After Fix ✅
- Prevention products automatically deduct from stock
- Inventory shows accurate quantities
- Complete usage tracking and audit trail
- Consistent behavior across all product types
- Historical data corrected via backfill

## Technical Details

### Database Trigger Flow
```
User adds prevention product in visit
          ↓
Frontend saves to biocide_usage table
          ↓
NEW: Trigger fires automatically
          ↓
usage_items entry created
          ↓
Stock automatically recalculated
          ↓
Inventory tab shows correct stock
```

### Tables Modified
- `usage_items` - New `biocide_usage_id` column added, constraint updated, new records created (current + historical)
- `biocide_usage` - Trigger added to auto-sync to usage_items
- `batches` - Stock auto-recalculated from usage_items

### Safety Features
- Duplicate prevention logic (checks for existing `biocide_usage_id` link)
- Stock validation temporarily disabled during backfill to allow historical records
- Preserves original timestamps for audit trail
- Uses same pattern as vaccination stock deduction
- Non-destructive (only adds data, never deletes)
- Constraint ensures each usage_item has exactly one valid source

## Testing Checklist

After applying the fix:
- [ ] Run test script: `node test-prevention-stock-deduction.cjs`
- [ ] Open Animal Sidepanel
- [ ] Create new visit with Profilaktika procedure
- [ ] Add a prevention product (specify qty, batch)
- [ ] Complete the visit (status = "Baigtas")
- [ ] Go to Atsargos (Inventory) tab
- [ ] Verify batch qty_left decreased by the amount used
- [ ] Check that prevention items show in usage reports

## Impact

### Immediate Effect
- All **future** prevention items will automatically deduct from stock

### Historical Correction
- All **past** prevention items will be backfilled
- Stock levels will be corrected retroactively to reflect actual usage
- Audit trail maintained with original dates
- **Important**: Some batches may show negative quantities if they were fully consumed. This is correct - it shows the products were used but not previously tracked.

### Consistency
- Prevention items now behave identically to treatments and vaccinations
- Single unified approach to stock tracking across the system
- Predictable, reliable inventory management

### Potential Side Effects
1. **Negative Stock Quantities**: Batches that were fully consumed may now show negative values. This is accurate - the products were used historically but stock wasn't deducted.
2. **Usage Reports**: Historical prevention usage will now appear in usage reports and analytics.
3. **Batch Tracking**: All prevention products will now be properly linked to their source batches.

## Notes

- This fix applies to all prevention products, not just biocides
- The `biocide_usage` table name is historical - it stores all prevention items
- No changes needed to frontend code - works with existing implementation
- The trigger uses `SECURITY DEFINER` to ensure proper permissions
- Backfill only runs once and skips existing usage_items

## Why This Was Missed

Prevention items used a different table (`biocide_usage`) than other product usage. The items were being saved correctly, so it appeared to work - but stock wasn't being deducted because there was no trigger to create the corresponding `usage_items` entries that the stock calculation relies on.

This fix brings prevention items in line with the rest of the system's stock tracking approach.
