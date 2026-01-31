/*
  # Fix Prevention (Profilaktika) Stock Deduction

  ## Problem
  When adding prevention products via the Profilaktika procedure in visits:
  - Products are saved to biocide_usage table ✅
  - Stock is NOT deducted ❌
  - Stock is only calculated from usage_items table
  - biocide_usage records are ignored in stock calculations

  ## Root Cause
  The usage_items table has a constraint that requires either treatment_id OR vaccination_id,
  but biocide_usage is neither. We need to add biocide_usage_id as a third valid source.

  ## Solution
  1. Add biocide_usage_id column to usage_items
  2. Update the source_check constraint to allow biocide_usage_id
  3. Create trigger to automatically sync biocide_usage to usage_items
  4. Backfill existing prevention records

  ## Tables Affected
  - usage_items (new column, updated constraint)
  - biocide_usage (trigger added)
  - batches (stock automatically recalculated)
*/

-- Step 1: Add biocide_usage_id column to usage_items
ALTER TABLE usage_items
ADD COLUMN IF NOT EXISTS biocide_usage_id uuid REFERENCES biocide_usage(id) ON DELETE SET NULL;

-- Step 2: Update the source check constraint to allow biocide_usage as a valid source
ALTER TABLE usage_items
DROP CONSTRAINT IF EXISTS usage_items_source_check;

ALTER TABLE usage_items
ADD CONSTRAINT usage_items_source_check CHECK (
  (treatment_id IS NOT NULL AND vaccination_id IS NULL AND biocide_usage_id IS NULL) OR
  (treatment_id IS NULL AND vaccination_id IS NOT NULL AND biocide_usage_id IS NULL) OR
  (treatment_id IS NULL AND vaccination_id IS NULL AND biocide_usage_id IS NOT NULL)
);

COMMENT ON CONSTRAINT usage_items_source_check ON usage_items IS
  'Ensures usage_items are linked to exactly one source: treatment, vaccination, or biocide_usage';

-- Step 3: Create function to sync biocide_usage to usage_items for stock deduction
CREATE OR REPLACE FUNCTION sync_biocide_usage_to_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create usage_item if we have the required fields for stock tracking
  IF NEW.batch_id IS NOT NULL AND NEW.qty IS NOT NULL AND NEW.qty > 0 THEN

    -- Check if a matching usage_item already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM usage_items
      WHERE biocide_usage_id = NEW.id
    ) THEN

      -- Insert into usage_items to track stock deduction
      INSERT INTO usage_items (
        treatment_id,
        vaccination_id,
        biocide_usage_id,
        product_id,
        batch_id,
        qty,
        unit,
        purpose,
        created_at
      ) VALUES (
        NULL,
        NULL,
        NEW.id,  -- Link to biocide_usage record
        NEW.product_id,
        NEW.batch_id,
        NEW.qty,
        NEW.unit::unit,
        COALESCE(NEW.purpose, 'Profilaktika'),
        NEW.created_at
      );

      RAISE NOTICE 'Created usage_item for prevention: biocide_usage_id=%, product_id=%, batch_id=%, qty=% %',
        NEW.id, NEW.product_id, NEW.batch_id, NEW.qty, NEW.unit;
    ELSE
      RAISE NOTICE 'Skipped duplicate usage_item for biocide_usage.id=%', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger to automatically sync biocide_usage to usage_items
DROP TRIGGER IF EXISTS trigger_sync_biocide_to_stock ON biocide_usage;

CREATE TRIGGER trigger_sync_biocide_to_stock
  AFTER INSERT ON biocide_usage
  FOR EACH ROW
  EXECUTE FUNCTION sync_biocide_usage_to_stock();

-- Step 5: Backfill existing biocide_usage records to create missing usage_items
DO $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count integer := 0;
  v_record record;
BEGIN
  RAISE NOTICE 'Backfilling biocide_usage records to usage_items for stock tracking...';

  -- Process all biocide_usage records with valid stock data
  FOR v_record IN
    SELECT
      id,
      product_id,
      batch_id,
      qty,
      unit,
      purpose,
      created_at
    FROM biocide_usage
    WHERE batch_id IS NOT NULL
      AND qty IS NOT NULL
      AND qty > 0
    ORDER BY created_at ASC
  LOOP
    -- Check if usage_item already exists for this biocide_usage record
    IF NOT EXISTS (
      SELECT 1 FROM usage_items
      WHERE biocide_usage_id = v_record.id
    ) THEN
      -- Insert new usage_item for stock tracking
      INSERT INTO usage_items (
        treatment_id,
        vaccination_id,
        biocide_usage_id,
        product_id,
        batch_id,
        qty,
        unit,
        purpose,
        created_at
      ) VALUES (
        NULL,
        NULL,
        v_record.id,
        v_record.product_id,
        v_record.batch_id,
        v_record.qty,
        v_record.unit::unit,
        COALESCE(v_record.purpose, 'Profilaktika'),
        v_record.created_at
      );

      v_inserted_count := v_inserted_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % new usage_items created, % skipped (already exist)',
    v_inserted_count, v_skipped_count;
END $$;

-- Add helpful comments
COMMENT ON COLUMN usage_items.biocide_usage_id IS
  'Links to biocide_usage record for prevention/biocide product usage tracking';

COMMENT ON FUNCTION sync_biocide_usage_to_stock IS
  'Automatically creates usage_items when prevention products (biocide_usage) are used. This ensures prevention products deduct from stock just like treatments and vaccinations.';

COMMENT ON TRIGGER trigger_sync_biocide_to_stock ON biocide_usage IS
  'Ensures prevention products (biocide_usage) deduct from stock by creating usage_items entries';
