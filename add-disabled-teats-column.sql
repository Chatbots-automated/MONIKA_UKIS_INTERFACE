/*
  # Add Disabled Teats Column to Treatments

  Run this SQL in your Supabase SQL Editor to add the disabled_teats column
  to the treatments table.

  This enables tracking which teats were marked as disabled during each treatment.
*/

-- Add disabled_teats column to treatments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'treatments' AND column_name = 'disabled_teats'
  ) THEN
    ALTER TABLE treatments ADD COLUMN disabled_teats text[];
    RAISE NOTICE 'Added disabled_teats column to treatments';
  ELSE
    RAISE NOTICE 'Column disabled_teats already exists';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN treatments.disabled_teats IS 'Array of teat positions that were disabled during this treatment (e.g., ["k1", "d2"])';
