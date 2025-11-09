-- SQL to check and add package tracking columns to batches table
-- Run this in your Supabase SQL Editor

-- First, check if columns exist
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'batches'
    AND column_name IN ('package_size', 'package_count')
ORDER BY column_name;

-- If columns don't exist, run this to add them:
DO $$
BEGIN
  -- Add package_size column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches' AND column_name = 'package_size'
  ) THEN
    ALTER TABLE batches ADD COLUMN package_size numeric(10,2);
    COMMENT ON COLUMN batches.package_size IS 'Size of a single package unit (e.g., 1 bottle = 10ml, 1 box = 100 tablets)';
  END IF;

  -- Add package_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches' AND column_name = 'package_count'
  ) THEN
    ALTER TABLE batches ADD COLUMN package_count numeric(10,2);
    COMMENT ON COLUMN batches.package_count IS 'Number of packages received (e.g., 6 bottles, 3 boxes)';
  END IF;
END $$;

-- Create or replace the function to automatically calculate received_qty
CREATE OR REPLACE FUNCTION calculate_received_qty()
RETURNS TRIGGER AS $$
BEGIN
  -- If both package_size and package_count are provided, calculate received_qty
  IF NEW.package_size IS NOT NULL AND NEW.package_count IS NOT NULL THEN
    NEW.received_qty := NEW.package_size * NEW.package_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create it
DROP TRIGGER IF EXISTS trigger_calculate_received_qty ON batches;
CREATE TRIGGER trigger_calculate_received_qty
  BEFORE INSERT OR UPDATE ON batches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_received_qty();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_batches_package_size ON batches(package_size);
CREATE INDEX IF NOT EXISTS idx_batches_package_count ON batches(package_count);

-- Verify the columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'batches'
    AND column_name IN ('package_size', 'package_count', 'received_qty')
ORDER BY column_name;
