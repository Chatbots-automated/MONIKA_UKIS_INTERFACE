# Stock Validation Issue - Fix Guide

## Problem

The migration fails with:
```
ERROR: Not enough stock in batch. Left: 0.9000, Tried: 2
```

This is because historical vaccinations already used the stock, but we're trying to retroactively record them.

## Solution: Updated Migration

The migration has been updated to temporarily disable the stock validation trigger during backfill.

### Try Running It Again

1. Copy the updated migration from: `supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql`
2. Paste into Supabase SQL Editor
3. Click "Run"

The migration now:
- ✅ Disables stock validation
- ✅ Backfills vaccinations  
- ✅ Re-enables stock validation

---

## If That Doesn't Work

Find the trigger name first:
```sql
SELECT tgname FROM pg_trigger WHERE tgrelid = 'usage_items'::regclass;
```

Then manually disable it, run backfill, and re-enable:
```sql
-- Disable (use actual trigger name)
ALTER TABLE usage_items DISABLE TRIGGER [trigger_name];

-- Backfill
INSERT INTO usage_items (treatment_id, product_id, batch_id, qty, unit, purpose, vaccination_id, created_at)
SELECT NULL, v.product_id, v.batch_id, v.dose_amount, v.unit, 'vaccination', v.id, v.created_at
FROM vaccinations v
WHERE v.batch_id IS NOT NULL
  AND v.dose_amount IS NOT NULL
  AND v.dose_amount > 0
  AND NOT EXISTS (SELECT 1 FROM usage_items ui WHERE ui.vaccination_id = v.id);

-- Re-enable
ALTER TABLE usage_items ENABLE TRIGGER [trigger_name];
```

---

**Status**: Updated migration ready  
**Goal**: Ensure ALL product usages (treatments, vaccinations, etc.) are tracked in atsargos
