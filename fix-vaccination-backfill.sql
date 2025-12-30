-- Find and disable ALL triggers on usage_items for backfill
-- This is safer than guessing the trigger name

-- Step 1: Find all triggers
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '=== Finding all triggers on usage_items ===';

  FOR trigger_record IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'usage_items'::regclass
      AND NOT tgisinternal
  LOOP
    RAISE NOTICE 'Found trigger: %', trigger_record.tgname;
  END LOOP;
END $$;

-- Step 2: Disable ALL user triggers on usage_items
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count integer := 0;
BEGIN
  RAISE NOTICE '=== Disabling all triggers on usage_items ===';

  FOR trigger_record IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'usage_items'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE usage_items DISABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
    trigger_count := trigger_count + 1;
  END LOOP;

  RAISE NOTICE 'Disabled % triggers', trigger_count;
END $$;

-- Step 3: Make treatment_id nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usage_items'
      AND column_name = 'treatment_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.usage_items ALTER COLUMN treatment_id DROP NOT NULL;
    RAISE NOTICE 'Made treatment_id nullable';
  END IF;
END $$;

-- Step 4: Add vaccination_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_items' AND column_name = 'vaccination_id'
  ) THEN
    ALTER TABLE public.usage_items
    ADD COLUMN vaccination_id uuid REFERENCES public.vaccinations(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_usage_items_vaccination_id ON public.usage_items(vaccination_id);
    RAISE NOTICE 'Added vaccination_id column';
  END IF;
END $$;

-- Step 5: Add check constraint
DO $$
BEGIN
  ALTER TABLE public.usage_items DROP CONSTRAINT IF EXISTS usage_items_source_check;

  ALTER TABLE public.usage_items
  ADD CONSTRAINT usage_items_source_check CHECK (
    (treatment_id IS NOT NULL AND vaccination_id IS NULL) OR
    (treatment_id IS NULL AND vaccination_id IS NOT NULL)
  );

  RAISE NOTICE 'Added source check constraint';
END $$;

-- Step 6: Backfill vaccinations (with ALL triggers disabled)
DO $$
DECLARE
  v_inserted_count integer;
BEGIN
  RAISE NOTICE '=== Starting backfill ===';

  INSERT INTO usage_items (
    treatment_id,
    product_id,
    batch_id,
    qty,
    unit,
    purpose,
    vaccination_id,
    created_at
  )
  SELECT
    NULL,
    v.product_id,
    v.batch_id,
    v.dose_amount,
    v.unit,
    'vaccination',
    v.id,
    v.created_at
  FROM vaccinations v
  WHERE v.batch_id IS NOT NULL
    AND v.dose_amount IS NOT NULL
    AND v.dose_amount > 0
    AND NOT EXISTS (
      SELECT 1 FROM usage_items ui
      WHERE ui.vaccination_id = v.id
    );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % vaccinations', v_inserted_count;
END $$;

-- Step 7: Re-enable ALL triggers
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count integer := 0;
BEGIN
  RAISE NOTICE '=== Re-enabling all triggers on usage_items ===';

  FOR trigger_record IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'usage_items'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE usage_items ENABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Enabled trigger: %', trigger_record.tgname;
    trigger_count := trigger_count + 1;
  END LOOP;

  RAISE NOTICE 'Re-enabled % triggers', trigger_count;
END $$;

-- Step 8: Create function for future vaccinations
CREATE OR REPLACE FUNCTION create_usage_item_from_vaccination()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL AND NEW.dose_amount IS NOT NULL AND NEW.dose_amount > 0 THEN
    INSERT INTO usage_items (
      treatment_id,
      product_id,
      batch_id,
      qty,
      unit,
      purpose,
      vaccination_id,
      created_at
    ) VALUES (
      NULL,
      NEW.product_id,
      NEW.batch_id,
      NEW.dose_amount,
      NEW.unit,
      'vaccination',
      NEW.id,
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger for future vaccinations
DROP TRIGGER IF EXISTS trigger_create_usage_from_vaccination ON public.vaccinations;
CREATE TRIGGER trigger_create_usage_from_vaccination
  AFTER INSERT ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION create_usage_item_from_vaccination();

-- Step 10: Verify results
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM usage_items WHERE vaccination_id IS NOT NULL;
  RAISE NOTICE '=== COMPLETE: % vaccination usage_items now exist ===', v_count;
END $$;
