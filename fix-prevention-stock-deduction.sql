/*
  # Fix Prevention (Profilaktika) Stock Deduction

  ## Problem
  When prevention items are added via the Profilaktika procedure in visits, they are saved
  to the biocide_usage table but NOT to usage_items. This means stock is NOT deducted.

  ## Analysis
  - 7 Profilaktika records in biocide_usage (177 bolus)
  - Only 1 Profilaktika record in usage_items (4 bolus)
  - 173 bolus missing from stock deduction!

  ## Solution
  1. Create a trigger on biocide_usage that automatically creates usage_items
  2. Backfill existing biocide_usage records to create missing usage_items
  3. Stock will be calculated correctly via the stock views

  ## Tables Affected
  - biocide_usage (trigger added)
  - usage_items (new records created)
*/

-- Step 1: Create function to automatically create usage_items from biocide_usage
CREATE OR REPLACE FUNCTION create_usage_item_from_biocide_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create usage_item if we have required fields
  IF NEW.batch_id IS NOT NULL AND NEW.qty IS NOT NULL AND NEW.qty > 0 THEN

    -- Check if a usage_item already exists for this biocide_usage record
    -- This prevents duplicate entries during backfill or if trigger fires multiple times
    IF NOT EXISTS (
      SELECT 1 FROM usage_items
      WHERE product_id = NEW.product_id
        AND batch_id = NEW.batch_id
        AND qty = NEW.qty
        AND COALESCE(purpose, '') = COALESCE(NEW.purpose, '')
        AND created_at = NEW.created_at
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
        NULL,  -- biocide_usage doesn't have treatment_id
        NEW.product_id,
        NEW.batch_id,
        NEW.qty,
        NEW.unit::unit,  -- Cast to unit enum type
        NEW.purpose,  -- Keep original purpose (e.g., "Profilaktika")
        NEW.created_at
      );

      RAISE NOTICE 'Created usage_item for biocide_usage %. Product: %, Batch: %, Qty: % %',
        NEW.id,
        NEW.product_id,
        NEW.batch_id,
        NEW.qty,
        NEW.unit;
    ELSE
      RAISE NOTICE 'Skipping duplicate usage_item for biocide_usage %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger to automatically create usage_items when biocide_usage is inserted
DROP TRIGGER IF EXISTS trigger_create_usage_from_biocide ON public.biocide_usage;
CREATE TRIGGER trigger_create_usage_from_biocide
  AFTER INSERT ON public.biocide_usage
  FOR EACH ROW
  EXECUTE FUNCTION create_usage_item_from_biocide_usage();

-- Step 3: Backfill existing biocide_usage records to create missing usage_items
-- Only process biocide_usage records that don't already have a corresponding usage_item
DO $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count integer := 0;
  v_record record;
BEGIN
  RAISE NOTICE 'Starting backfill of biocide_usage to usage_items...';

  -- Process each biocide_usage record
  FOR v_record IN
    SELECT
      bu.id,
      bu.product_id,
      bu.batch_id,
      bu.qty,
      bu.unit,
      bu.purpose,
      bu.created_at
    FROM biocide_usage bu
    WHERE bu.batch_id IS NOT NULL
      AND bu.qty IS NOT NULL
      AND bu.qty > 0
    ORDER BY bu.created_at ASC
  LOOP
    -- Check if usage_item already exists
    IF NOT EXISTS (
      SELECT 1 FROM usage_items ui
      WHERE ui.product_id = v_record.product_id
        AND ui.batch_id = v_record.batch_id
        AND ui.qty = v_record.qty
        AND COALESCE(ui.purpose, '') = COALESCE(v_record.purpose, '')
        AND ui.created_at = v_record.created_at
    ) THEN
      -- Insert new usage_item
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
        v_record.purpose,
        v_record.created_at
      );

      v_inserted_count := v_inserted_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill completed: % usage_items created, % skipped (already exist)',
    v_inserted_count, v_skipped_count;
END $$;

-- Step 4: Add helpful comments
COMMENT ON FUNCTION create_usage_item_from_biocide_usage IS
  'Automatically creates usage_items when biocide_usage (prevention items) are inserted. ' ||
  'This ensures stock is deducted for prevention items just like treatments and vaccinations.';

COMMENT ON TRIGGER trigger_create_usage_from_biocide ON public.biocide_usage IS
  'Ensures prevention items (biocide_usage) deduct from stock by creating corresponding usage_items';

-- Success message
SELECT
  'Prevention stock deduction fix applied!' as status,
  'All biocide_usage records now create usage_items for proper stock tracking' as description;
