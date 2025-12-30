/*
  # Add Batch Stock Tracking Columns

  ## Problem
  The error "Not enough stock in batch. Left: 0, Tried: 5" occurs because:
  - There's a trigger `usage_items_stock_check_trigger` that validates stock
  - It expects `batches.qty_left` column which doesn't exist
  - All stock checks fail since qty_left is NULL/undefined

  ## Solution
  1. Add missing columns to batches: qty_left, batch_number, status
  2. Initialize qty_left from received_qty for existing batches
  3. Create function to maintain qty_left when usage_items are inserted
  4. Create view to calculate remaining stock dynamically

  ## New Columns
  - qty_left: Remaining quantity in this batch (updated by trigger)
  - batch_number: Human-readable batch identifier (auto-generated from lot or id)
  - status: Batch status (active, depleted, expired)
*/

-- Step 1: Add qty_left column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches' AND column_name = 'qty_left'
  ) THEN
    ALTER TABLE batches ADD COLUMN qty_left numeric(10,2);
    RAISE NOTICE 'Added qty_left column to batches';
  END IF;
END $$;

-- Step 2: Add batch_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE batches ADD COLUMN batch_number text;
    RAISE NOTICE 'Added batch_number column to batches';
  END IF;
END $$;

-- Step 3: Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches' AND column_name = 'status'
  ) THEN
    ALTER TABLE batches
    ADD COLUMN status text DEFAULT 'active'
    CHECK (status IN ('active', 'depleted', 'expired'));

    RAISE NOTICE 'Added status column to batches';
  END IF;
END $$;

-- Step 4: Initialize qty_left from received_qty minus already used
DO $$
DECLARE
  v_batch record;
  v_used numeric;
BEGIN
  FOR v_batch IN SELECT id, received_qty FROM batches WHERE qty_left IS NULL
  LOOP
    -- Calculate how much has already been used from this batch
    SELECT COALESCE(SUM(qty), 0)
    INTO v_used
    FROM usage_items
    WHERE batch_id = v_batch.id;

    -- Set qty_left = received_qty - used
    UPDATE batches
    SET qty_left = COALESCE(v_batch.received_qty, 0) - v_used
    WHERE id = v_batch.id;
  END LOOP;

  RAISE NOTICE 'Initialized qty_left for all batches';
END $$;

-- Step 5: Initialize batch_number from lot or generate from date
UPDATE batches
SET batch_number = COALESCE(
  NULLIF(lot, ''),
  'B-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || SUBSTRING(id::text, 1, 8)
)
WHERE batch_number IS NULL;

-- Step 6: Update status based on qty_left and expiry
UPDATE batches
SET status = CASE
  WHEN expiry_date < CURRENT_DATE THEN 'expired'
  WHEN qty_left <= 0 THEN 'depleted'
  ELSE 'active'
END
WHERE status IS NULL OR status = 'active';

-- Step 7: Create or replace function to update qty_left when usage_items are inserted
CREATE OR REPLACE FUNCTION update_batch_qty_left()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct from batch stock
  UPDATE batches
  SET
    qty_left = qty_left - NEW.qty,
    status = CASE
      WHEN (qty_left - NEW.qty) <= 0 THEN 'depleted'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.batch_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create or replace trigger to maintain qty_left
DROP TRIGGER IF EXISTS trigger_update_batch_qty_left ON usage_items;
CREATE TRIGGER trigger_update_batch_qty_left
  AFTER INSERT ON usage_items
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL)
  EXECUTE FUNCTION update_batch_qty_left();

-- Step 9: Create or replace the stock validation function
CREATE OR REPLACE FUNCTION check_batch_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_qty_left numeric;
  v_batch_number text;
BEGIN
  -- Only check if we have a batch_id
  IF NEW.batch_id IS NOT NULL THEN
    -- Get current stock level
    SELECT qty_left, batch_number
    INTO v_qty_left, v_batch_number
    FROM batches
    WHERE id = NEW.batch_id;

    -- Check if we have enough stock
    IF v_qty_left IS NULL THEN
      RAISE EXCEPTION 'Batch % not found or qty_left is NULL', NEW.batch_id;
    END IF;

    IF v_qty_left < NEW.qty THEN
      RAISE EXCEPTION 'Not enough stock in batch. Left: %, Tried: %', v_qty_left, NEW.qty;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create or replace the stock check trigger
DROP TRIGGER IF EXISTS usage_items_stock_check_trigger ON usage_items;
CREATE TRIGGER usage_items_stock_check_trigger
  BEFORE INSERT ON usage_items
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL)
  EXECUTE FUNCTION check_batch_stock();

-- Step 11: Drop and recreate views (must drop dependent views first)
-- Drop stock_by_product first (it depends on stock_by_batch)
DROP VIEW IF EXISTS stock_by_product CASCADE;

-- Drop and recreate stock_by_batch with new columns
DROP VIEW IF EXISTS stock_by_batch CASCADE;
CREATE VIEW stock_by_batch AS
SELECT
  b.id as batch_id,
  p.id as product_id,
  b.qty_left as on_hand,
  b.expiry_date,
  b.lot,
  b.mfg_date,
  b.batch_number,
  b.status,
  p.name as product_name,
  p.category as product_category,
  b.received_qty,
  COALESCE(SUM(ui.qty), 0) as total_used,
  b.created_at,
  CASE
    WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
    WHEN b.qty_left <= 0 THEN 'Depleted'
    WHEN b.qty_left < (b.received_qty * 0.2) THEN 'Low Stock'
    ELSE 'Available'
  END as stock_status
FROM batches b
JOIN products p ON b.product_id = p.id
LEFT JOIN usage_items ui ON ui.batch_id = b.id
GROUP BY b.id, b.batch_number, b.lot, b.status, p.id, p.name, p.category,
         b.received_qty, b.qty_left, b.expiry_date, b.mfg_date, b.created_at
ORDER BY b.created_at DESC;

-- Recreate stock_by_product view
CREATE VIEW stock_by_product AS
SELECT
  product_id,
  product_name as name,
  product_category as category,
  SUM(on_hand) as on_hand
FROM stock_by_batch
GROUP BY product_id, product_name, product_category;

-- Step 12: Add helpful comments
COMMENT ON COLUMN batches.qty_left IS 'Remaining quantity in this batch, automatically updated when usage_items are inserted';
COMMENT ON COLUMN batches.batch_number IS 'Human-readable batch identifier, generated from lot or created_at';
COMMENT ON COLUMN batches.status IS 'Batch status: active, depleted, or expired';
COMMENT ON FUNCTION check_batch_stock IS 'Validates that sufficient stock exists before allowing usage_items insertion';
COMMENT ON FUNCTION update_batch_qty_left IS 'Automatically updates qty_left when usage_items are inserted';
COMMENT ON VIEW stock_by_batch IS 'Consolidated view of stock levels by batch with usage tracking and backward-compatible on_hand column';
COMMENT ON VIEW stock_by_product IS 'Aggregated stock levels by product';
