# Vaccination Stock Deduction Fix - Migration Instructions

## Problem Identified

Vaccinations are NOT being deducted from stock in the **Atsargos (Inventory)** tab because:

- **Inventory calculation**: `stock = received_qty - sum(usage_items.qty)`
- **Treatments**: Create `usage_items` records → Stock gets deducted ✅
- **Vaccinations**: Do NOT create `usage_items` records → Stock does NOT get deducted ❌

However, vaccinations ARE tracked correctly in the **"Vaistų Panaudojimas"** section because that component reads from both `usage_items` AND `vaccinations` tables directly.

## Solution Implemented

1. ✅ Created database migration: `supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`
2. ✅ Updated `ProductUsageAnalysis.tsx` to prevent double-counting
3. ⏳ **Migration needs to be applied to database** (see instructions below)

## What the Migration Does

1. **Adds `vaccination_id` column** to `usage_items` table to track the relationship
2. **Creates trigger** that automatically generates `usage_items` when a vaccination is inserted
3. **Backfills existing vaccinations** by creating `usage_items` for all historical vaccinations
4. **Prevents future issues** by ensuring all new vaccinations automatically deduct stock

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase SQL Editor:
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new

2. Copy the ENTIRE contents of this file:
   `supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`

3. Paste into the SQL editor

4. Click **"Run"**

5. Verify success - you should see:
   - `ALTER TABLE` success message
   - `CREATE FUNCTION` success message
   - `CREATE TRIGGER` success message
   - `INSERT` success message with row count

### Option 2: Supabase CLI (If installed)

```bash
supabase db push
```

### Option 3: Manual PostgreSQL Connection

If you have `psql` or a database client:

```bash
# Get connection string from Supabase Dashboard > Project Settings > Database
psql "your-connection-string" < supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql
```

## After Migration

### Immediate Effects

1. **Stock will be correct**: All vaccinations (past and future) will now properly deduct from inventory
2. **No double-counting**: The `ProductUsageAnalysis` component has been updated to skip vaccinations that already have `usage_items`
3. **Automatic deduction**: Every new vaccination will automatically create a `usage_items` record

### Testing

1. Check **Atsargos** tab - stock levels should now reflect vaccination usage
2. Create a new vaccination - stock should immediately decrease
3. Check **Vaistų Panaudojimas** - counts should remain accurate (no duplicates)

## Rollback (If Needed)

If you need to revert this change:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_create_usage_from_vaccination ON public.vaccinations;

-- Remove function
DROP FUNCTION IF EXISTS create_usage_item_from_vaccination();

-- Remove vaccination-created usage_items
DELETE FROM usage_items WHERE vaccination_id IS NOT NULL;

-- Remove column
ALTER TABLE usage_items DROP COLUMN IF EXISTS vaccination_id;
```

## Technical Details

### Database Changes

- **Table**: `usage_items`
  - New column: `vaccination_id uuid` (foreign key to `vaccinations.id`)
  - New index: `idx_usage_items_vaccination_id`

- **Function**: `create_usage_item_from_vaccination()`
  - Trigger function that creates `usage_items` on vaccination INSERT
  - Runs with `SECURITY DEFINER` to ensure proper permissions

- **Trigger**: `trigger_create_usage_from_vaccination`
  - AFTER INSERT on `vaccinations` table
  - Calls the function above for each new vaccination

### Code Changes

- **File**: `src/components/ProductUsageAnalysis.tsx`
  - Modified vaccination processing logic
  - Now skips vaccinations that already have corresponding `usage_items`
  - Prevents double-counting in reports and analytics

## Questions?

If you encounter any issues:

1. Check Supabase logs for error messages
2. Verify the migration file exists: `ls -la supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`
3. Ensure you have sufficient database permissions (use service role key)
4. Contact support if persistent errors occur

---

**Status**: ⏳ Waiting for manual migration execution
**Priority**: HIGH - This fixes a critical inventory tracking bug
**Estimated time**: 2-3 minutes to apply
