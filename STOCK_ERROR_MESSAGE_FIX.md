# Stock Error Message Improvement

## Problem
When stock is insufficient, the error message only shows:
```
Not enough stock in batch. Left: 5, Tried: 10
```

This doesn't tell the user WHICH product/medicine is lacking.

## Solution
Update the `check_batch_stock()` function to include:
- Product name
- Batch number
- Remaining quantity
- Attempted quantity

## New Error Format
```
Not enough stock for "Amoxicillin 500mg" (batch: B-20240101-abc). Left: 5, Tried: 10
```

## To Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Copy and paste the SQL below
3. Click "Run"

### Option 2: Save to migrations folder
Save as: `supabase/migrations/20260107000000_improve_stock_error_message.sql`

## SQL

```sql
CREATE OR REPLACE FUNCTION check_batch_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_qty_left numeric;
  v_batch_number text;
  v_product_name text;
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    SELECT b.qty_left, b.batch_number, p.name
    INTO v_qty_left, v_batch_number, v_product_name
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.id = NEW.batch_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch % not found', NEW.batch_id;
    END IF;

    IF v_qty_left IS NULL THEN
      RAISE EXCEPTION 'Batch % (%) has NULL qty_left', v_batch_number, v_product_name;
    END IF;

    IF v_qty_left < NEW.qty THEN
      RAISE EXCEPTION 'Not enough stock for "%" (batch: %). Left: %, Tried: %',
        v_product_name, v_batch_number, v_qty_left, NEW.qty;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## After Applying
Users will see clear error messages identifying exactly which product lacks stock, making it easy to know what needs to be reordered or which batch to use instead.
