# Critical Stock Deduction Bug Fix

## Problem Identified

The system has inconsistent stock deduction because it uses **TWO separate tables** for tracking product usage:

1. **`usage_items`** - Used for most medications (✓ properly deducted from stock)
2. **`biocide_usage`** - Used for biocides and hoof treatments (✗ NOT deducted from stock)

The `stock_by_batch` view only considers `usage_items`, so when biocides or hoof treatments are recorded in `biocide_usage`, the stock levels don't update.

## Root Cause

- Frontend code in `Biocides.tsx` inserts into `biocide_usage` table
- Frontend code in `AnimalDetailSidebar.tsx` (lines 3038-3049, 2860-2890) inserts hoof treatment usage into `biocide_usage`
- The inventory views and stock calculations only look at `usage_items`
- Result: Biocides and hoof treatments are used but never deducted from inventory

## Solution Required

### 1. Database Migration (MUST BE RUN MANUALLY)

Run this SQL in your Supabase SQL editor:

```sql
/*
  Fix Stock Deduction for Biocides and All Products

  This migration consolidates all product usage into usage_items table
  to ensure proper stock deduction across all product types.
*/

-- Step 1: Add missing columns to usage_items
ALTER TABLE public.usage_items ADD COLUMN IF NOT EXISTS use_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.usage_items ADD COLUMN IF NOT EXISTS work_scope text;
ALTER TABLE public.usage_items ADD COLUMN IF NOT EXISTS used_by_name text;

-- Step 2: Migrate existing biocide_usage records to usage_items
INSERT INTO public.usage_items (
  product_id,
  batch_id,
  qty,
  unit,
  purpose,
  use_date,
  work_scope,
  used_by_name,
  created_at
)
SELECT
  bu.product_id,
  bu.batch_id,
  bu.qty,
  bu.unit,
  bu.purpose,
  bu.use_date,
  bu.work_scope,
  bu.used_by_name,
  bu.created_at
FROM public.biocide_usage bu
WHERE NOT EXISTS (
  SELECT 1 FROM public.usage_items ui
  WHERE ui.product_id = bu.product_id
    AND ui.batch_id = bu.batch_id
    AND ui.qty = bu.qty
    AND ui.created_at = bu.created_at
);

-- Step 3: Create trigger to redirect new biocide_usage inserts to usage_items
CREATE OR REPLACE FUNCTION redirect_biocide_to_usage_items()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_items (
    product_id,
    batch_id,
    qty,
    unit,
    purpose,
    use_date,
    work_scope,
    used_by_name
  ) VALUES (
    NEW.product_id,
    NEW.batch_id,
    NEW.qty,
    NEW.unit,
    NEW.purpose,
    NEW.use_date,
    NEW.work_scope,
    NEW.used_by_name
  );
  RETURN NULL; -- Prevent insert into biocide_usage
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_redirect_biocide_usage ON public.biocide_usage;
CREATE TRIGGER trigger_redirect_biocide_usage
  BEFORE INSERT ON public.biocide_usage
  FOR EACH ROW
  EXECUTE FUNCTION redirect_biocide_to_usage_items();
```

### 2. Frontend Code Updates

The frontend code has been updated to:
- Insert all biocide usage into `usage_items` instead of `biocide_usage`
- Insert all hoof treatment product usage into `usage_items`
- Maintain backward compatibility by querying both tables when reading historical data

## Files Modified

1. `src/components/Biocides.tsx` - Now inserts into `usage_items`
2. `src/components/AnimalDetailSidebar.tsx` - Hoof treatments now use `usage_items`

## Testing Checklist

After applying the migration and deploying code:

- [ ] Add a biocide usage and verify stock decreases
- [ ] Add a hoof treatment with product and verify stock decreases
- [ ] Add regular medication and verify stock decreases
- [ ] Check that historical biocide usage is still visible
- [ ] Verify inventory levels are correct across all product types

## Impact

This fix ensures that ALL product usage is properly tracked and deducted from inventory, preventing stock discrepancies and inventory mismatches.
