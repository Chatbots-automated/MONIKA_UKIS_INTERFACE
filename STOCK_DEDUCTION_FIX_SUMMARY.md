# Stock Deduction Fix - Complete Summary

## Problem Found

Medicines and other products were **sometimes not being deducted from stock** (atsargos tab) because:

### Root Cause: Vaccinations Don't Create usage_items

The inventory system calculates stock as:
```
Stock = received_qty - sum(usage_items.qty)
```

| Action Type | Creates usage_items? | Stock Deducted? | Tracked in "Vaistų Panaudojimas"? |
|-------------|---------------------|-----------------|-----------------------------------|
| **Treatments (Gydymas)** | ✅ YES | ✅ YES | ✅ YES |
| **Vaccinations (Vakcinos)** | ❌ NO | ❌ NO | ✅ YES |
| **Course Medications** | ✅ YES (on visit completion) | ✅ YES | ✅ YES |

This explains why:
- Treatments ALWAYS deducted stock correctly
- Vaccinations NEVER deducted stock in atsargos
- But vaccinations WERE tracked in "vaistų panaudojimas" (it reads both tables)

## Solution Implemented

### 1. Database Migration Created ✅

**File**: `supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`

The migration:
- ✅ Adds `vaccination_id` column to `usage_items` table
- ✅ Creates trigger to automatically generate `usage_items` when vaccination is inserted
- ✅ Backfills ALL existing vaccinations (creates usage_items for historical data)
- ✅ Prevents double-counting by linking records

### 2. Code Updated ✅

**File**: `src/components/ProductUsageAnalysis.tsx`

Updated to:
- ✅ Skip vaccinations that already have `usage_items` (prevents double-counting)
- ✅ Only process "legacy" vaccinations (before the trigger was added)
- ✅ Maintain backward compatibility

### 3. Project Built Successfully ✅

```
✓ 1603 modules transformed
✓ built in 13.24s
```

No errors or warnings related to the changes.

## Next Steps for You

### Step 1: Apply the Database Migration

You need to run the SQL migration to fix the database:

**Option A: Supabase Dashboard** (Recommended - 2 minutes)
1. Visit: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Copy contents of: `supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`
3. Paste into SQL editor
4. Click "Run"

**Option B: Supabase CLI**
```bash
supabase db push
```

### Step 2: Verify the Fix

After applying the migration:

1. **Check Atsargos Tab**
   - Stock levels should now reflect all vaccination usage
   - Numbers should match reality

2. **Create a Test Vaccination**
   - Add a new vaccination
   - Immediately check atsargos
   - Stock should decrease automatically

3. **Check Vaistų Panaudojimas**
   - Verify no duplicate entries
   - Counts should be accurate

### Step 3: Monitor for Issues

Over the next few days:
- Watch for any stock discrepancies
- Verify vaccinations are being tracked
- Check that treatments still work correctly

## What Will Change

### Before Migration
- Vaccinations: Not deducted from atsargos ❌
- Treatments: Deducted correctly ✅
- Reports: Some double-counting issues ⚠️

### After Migration
- Vaccinations: Automatically deducted from atsargos ✅
- Treatments: Continue working correctly ✅
- Reports: No double-counting ✅
- Historical data: All backfilled automatically ✅

## Files Changed

```
Modified:
  src/components/ProductUsageAnalysis.tsx

Created:
  supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql
  MIGRATION_INSTRUCTIONS.md (detailed instructions)
  STOCK_DEDUCTION_FIX_SUMMARY.md (this file)
  apply-migration.cjs (helper script)
  execute-migration.cjs (auto-apply attempt)
  run-migration.cjs (connection helper)
```

## Technical Deep Dive

### Why This Happened

The system evolved with two separate tracking mechanisms:
1. **usage_items** table - for treatments and direct medication usage
2. **vaccinations** table - specialized table for vaccination records

The inventory system only looked at `usage_items`, missing vaccinations entirely.

### The Fix Architecture

```
┌─────────────┐
│ Vaccination │
│   Inserted  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ Trigger Fires Automatically │
│ create_usage_item_from_     │
│      vaccination()          │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────┐
│ usage_items Created │
│ - product_id        │
│ - batch_id          │
│ - qty               │
│ - vaccination_id ←──┼─ Links back to vaccination
└──────┬──────────────┘
       │
       ▼
┌────────────────────┐
│ Stock Deducted     │
│ Automatically      │
└────────────────────┘
```

### Backfill Safety

The backfill query includes safety checks:
```sql
WHERE v.batch_id IS NOT NULL
  AND v.dose_amount IS NOT NULL
  AND v.dose_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM usage_items ui
    WHERE ui.vaccination_id = v.id
  )
```

This ensures:
- Only valid vaccinations are processed
- No duplicates are created (idempotent)
- Can be run multiple times safely

## Rollback Plan

If you need to revert (unlikely):

```sql
-- Run this in Supabase SQL editor
DROP TRIGGER IF EXISTS trigger_create_usage_from_vaccination ON public.vaccinations;
DROP FUNCTION IF EXISTS create_usage_item_from_vaccination();
DELETE FROM usage_items WHERE vaccination_id IS NOT NULL;
ALTER TABLE usage_items DROP COLUMN IF EXISTS vaccination_id;
```

## Support

If you encounter issues:

1. ✅ Check the detailed instructions: `MIGRATION_INSTRUCTIONS.md`
2. ✅ Review Supabase logs for error messages
3. ✅ Verify migration file exists: `ls supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`
4. ✅ Test in a staging environment first (if available)

---

**Status**: 🎉 Code ready, awaiting database migration
**Impact**: Fixes critical inventory tracking bug
**Risk**: Low (includes backfill safety checks)
**Time to apply**: ~2 minutes
**Downtime**: None (migration runs while system is live)
