# Prevention (Profilaktika) Stock Deduction - FIXED

## Problem Discovered
When creating visits with the **Profilaktika** (prevention) procedure, stock was **NOT being deducted** from inventory. Prevention items were being saved to the database but not reducing available stock.

## Root Cause Analysis

### How Stock Deduction Works
The system uses a unified approach for stock tracking:
1. All usage is recorded in the `usage_items` table
2. Stock levels are calculated from the `usage_items` table
3. Different features use triggers to create `usage_items`:
   - **Treatments (Gydymas)** → Directly inserted into `usage_items` ✅
   - **Vaccinations (Vakcina)** → Saved to `vaccinations`, trigger creates `usage_items` ✅
   - **Prevention (Profilaktika)** → Saved to `biocide_usage`, **NO trigger** ❌

### Investigation Results
Testing with batch `00723d68-ce19-4ce5-94ff-84d3af0a1a8d`:
- **biocide_usage table**: 7 records, **177 bolus** total
- **usage_items table**: Only 1 record, **4 bolus** total
- **Missing from stock**: **173 bolus** (98% of prevention items not deducted!)

```
BEFORE FIX:
  ❌ Profilaktika records in biocide_usage: 7 records (177 bolus)
  ❌ Profilaktika records in usage_items: 1 record (4 bolus)
  ❌ MISSING FROM STOCK DEDUCTION: 173 bolus!
```

## Solution Implemented

Created a trigger system identical to how vaccinations work:

### 1. Trigger Function
**Function**: `create_usage_item_from_biocide_usage()`
- Automatically runs when a prevention item is added to `biocide_usage`
- Creates a corresponding record in `usage_items`
- Includes duplicate prevention logic
- Proper unit type casting

### 2. Automatic Trigger
**Trigger**: `trigger_create_usage_from_biocide`
- Fires AFTER INSERT on `biocide_usage` table
- Ensures every prevention item creates a usage_item
- Stock is automatically deducted via the stock calculation views

### 3. Backfill of Historical Data
- Processes all existing `biocide_usage` records
- Creates missing `usage_items` entries
- Prevents duplicates during backfill
- Maintains original timestamps for audit trail

## Files Created

1. **fix-prevention-stock-deduction.sql** - The complete fix (trigger + backfill)
2. **test-prevention-stock-fix.cjs** - Test script to verify the fix
3. **investigate-prevention-deduction.cjs** - Analysis script
4. **check-prevention-stock.cjs** - Diagnostic script

## How to Apply

### Step 1: Apply the SQL Fix
1. Open `fix-prevention-stock-deduction.sql`
2. Go to your Supabase SQL Editor
3. Copy and paste the entire file
4. Click "Run"

### Step 2: Verify the Fix
```bash
node test-prevention-stock-fix.cjs
```

Expected output after fix:
```
✅ FIX APPEARS TO BE APPLIED!
  Usage items now match biocide_usage records
  Stock deduction is working correctly for prevention items
```

## What This Fixes

### Before Fix
- ❌ Prevention items saved but stock not deducted
- ❌ Inventory shows incorrect quantities
- ❌ Can order products that are actually used
- ❌ Stock reports inaccurate

### After Fix
- ✅ Prevention items automatically deduct from stock
- ✅ Inventory shows correct quantities
- ✅ Stock validation prevents over-usage
- ✅ Complete audit trail in usage_items
- ✅ Consistent with treatments and vaccinations

## Technical Details

### Tables Involved
- **biocide_usage** - Records prevention item usage
- **usage_items** - Unified stock deduction table
- **batches** - Stock levels (calculated from usage_items)

### Trigger Logic
```sql
biocide_usage INSERT
  ↓
trigger_create_usage_from_biocide
  ↓
create_usage_item_from_biocide_usage()
  ↓
usage_items INSERT
  ↓
Stock automatically deducted
```

### Data Flow
1. User creates visit with "Profilaktika" procedure
2. Frontend saves to `biocide_usage` table
3. **NEW**: Trigger automatically creates `usage_items` entry
4. Stock calculation views see the usage
5. Inventory tab shows correct stock levels

## Impact Assessment

### Historical Data
All historical prevention items will be backfilled:
- Previous visits won't be affected
- Stock levels will be corrected retroactively
- Audit trail preserved with original timestamps

### Future Prevention Items
All new prevention items will:
- Automatically deduct from stock
- Work exactly like treatments and vaccinations
- Maintain consistent behavior across the system

## Testing Checklist

After applying the fix, test:
- [ ] Create a new visit with Profilaktika procedure
- [ ] Add prevention products
- [ ] Complete the visit
- [ ] Verify stock is deducted in Atsargos tab
- [ ] Check usage_items table has the record
- [ ] Verify batch qty_left decreased

## Notes

- The trigger includes duplicate prevention to avoid issues during backfill
- Unit values are properly cast to the enum type
- The solution is identical to vaccination stock deduction (proven pattern)
- No changes needed to the frontend - works with existing code
- Maintains backward compatibility with existing data

## Prevention (No Pun Intended)

This issue occurred because:
1. Vaccinations and treatments had triggers, but prevention didn't
2. Prevention items used a different table (biocide_usage)
3. No one noticed because the records were being saved (just not deducting stock)

**Recommendation**: All usage tables should have triggers to create usage_items entries for consistency.
