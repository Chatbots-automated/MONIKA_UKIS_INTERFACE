/*
  # Fix Prevention (Profilaktika) Stock Deduction

  ## Problem
  When adding prevention products via the Profilaktika procedure in visits:
  - Products are saved to biocide_usage table ✅
  - Stock is NOT deducted ❌
  - Stock is only calculated from usage_items table
  - biocide_usage records are ignored in stock calculations

  ## Solution
  Create a trigger on biocide_usage that automatically creates corresponding
  usage_items entries, just like vaccinations do. This ensures:
  - Prevention products deduct from stock
  - Consistent behavior across all product usage types
  - Existing prevention records are backfilled

  ## Tables Affected
  - biocide_usage (trigger added)
  - usage_items (new records created)
  - batches (stock automatically recalculated)
*/

-- Create function to sync biocide_usage to usage_items for stock deduction
CREATE OR REPLACE FUNCTION sync_biocide_usage_to_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create usage_item if we have the required fields for stock tracking
  IF NEW.batch_id IS NOT NULL AND NEW.qty IS NOT NULL AND NEW.qty > 0 THEN

    -- Check if a matching usage_item already exists to prevent duplicates
    -- Match on product, batch, qty, purpose, and timestamp
    IF NOT EXISTS (
      SELECT 1 FROM usage_items
      WHERE product_id = NEW.product_id
        AND batch_id = NEW.batch_id
        AND qty = NEW.qty
        AND COALESCE(purpose, '') = COALESCE(NEW.purpose, '')
        AND abs(extract(epoch from (created_at - NEW.created_at))) < 1
    ) THEN

      -- Insert into usage_items to track stock deduction
      INSERT INTO usage_items (
        treatment_id,
        product_id,
        batch_id,
        qty,
        unit,
        purpose,
        created_at
      ) VALUES (
        NULL,  -- biocide_usage doesn't link to treatments
        NEW.product_id,
        NEW.batch_id,
        NEW.qty,
        NEW.unit::unit,  -- Cast text to unit enum
        COALESCE(NEW.purpose, 'Profilaktika'),
        NEW.created_at
      );

      RAISE NOTICE 'Created usage_item for prevention: product_id=%, batch_id=%, qty=% %',
        NEW.product_id, NEW.batch_id, NEW.qty, NEW.unit;
    ELSE
      RAISE NOTICE 'Skipped duplicate usage_item for biocide_usage.id=%', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync biocide_usage to usage_items
DROP TRIGGER IF EXISTS trigger_sync_biocide_to_stock ON biocide_usage;

CREATE TRIGGER trigger_sync_biocide_to_stock
  AFTER INSERT ON biocide_usage
  FOR EACH ROW
  EXECUTE FUNCTION sync_biocide_usage_to_stock();

-- Backfill existing biocide_usage records to create missing usage_items
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
      WHERE product_id = v_record.product_id
        AND batch_id = v_record.batch_id
        AND qty = v_record.qty
        AND COALESCE(purpose, '') = COALESCE(v_record.purpose, '')
        AND abs(extract(epoch from (created_at - v_record.created_at))) < 1
    ) THEN
      -- Insert new usage_item for stock tracking
      INSERT INTO usage_items (
        treatment_id,
        product_id,
        batch_id,
        qty,
        unit,
        purpose,
        created_at
      ) VALUES (
        NULL,
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
COMMENT ON FUNCTION sync_biocide_usage_to_stock IS
  'Automatically creates usage_items when prevention products (biocide_usage) are used. ' ||
  'This ensures prevention products deduct from stock just like treatments and vaccinations.';

COMMENT ON TRIGGER trigger_sync_biocide_to_stock ON biocide_usage IS
  'Ensures prevention products (biocide_usage) deduct from stock by creating usage_items entries';
