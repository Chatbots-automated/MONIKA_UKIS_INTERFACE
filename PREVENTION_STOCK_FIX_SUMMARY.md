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
3. No trigger exists to sync `biocide_usage` → `usage_items`
4. Result: Prevention items are recorded but don't reduce stock

## The Fix

**File**: `fix-prevention-stock-deduction.sql`

### What It Does

1. **Creates a trigger** on `biocide_usage` table
   - Automatically creates `usage_items` entry when prevention product is used
   - Matches the pattern used for vaccinations (proven approach)

2. **Backfills historical data**
   - Processes all existing `biocide_usage` records
   - Creates missing `usage_items` entries
   - Prevents duplicates
   - Preserves original timestamps

3. **Ensures consistency**
   - Prevention items now work exactly like treatments and vaccinations
   - Stock deduction is automatic and reliable
   - No frontend changes needed

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
- `biocide_usage` - Trigger added
- `usage_items` - New records created (current + historical)
- `batches` - Stock auto-recalculated from usage_items

### Safety Features
- Duplicate prevention logic (won't create duplicate usage_items)
- Preserves original timestamps for audit trail
- Uses same pattern as vaccination stock deduction
- Non-destructive (only adds data, never deletes)

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
- Stock levels will be corrected retroactively
- Audit trail maintained with original dates

### Consistency
- Prevention items now behave identically to treatments and vaccinations
- Single unified approach to stock tracking across the system
- Predictable, reliable inventory management

## Notes

- This fix applies to all prevention products, not just biocides
- The `biocide_usage` table name is historical - it stores all prevention items
- No changes needed to frontend code - works with existing implementation
- The trigger uses `SECURITY DEFINER` to ensure proper permissions
- Backfill only runs once and skips existing usage_items

## Why This Was Missed

Prevention items used a different table (`biocide_usage`) than other product usage. The items were being saved correctly, so it appeared to work - but stock wasn't being deducted because there was no trigger to create the corresponding `usage_items` entries that the stock calculation relies on.

This fix brings prevention items in line with the rest of the system's stock tracking approach.
