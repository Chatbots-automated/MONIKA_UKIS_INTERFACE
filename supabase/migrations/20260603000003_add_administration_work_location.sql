-- ============================================================================
-- ADD ADMINISTRATION TO WORK_LOCATION CONSTRAINT
-- ============================================================================
-- This migration updates the work_location constraint on the users table
-- to include 'administration' as a valid value
-- ============================================================================

-- Drop the existing constraint on users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_work_location_check;

-- Add the new constraint with administration included
ALTER TABLE users ADD CONSTRAINT users_work_location_check 
  CHECK (work_location IN ('farm', 'warehouse', 'both', 'administration'));

-- Update the comment
COMMENT ON COLUMN users.work_location IS 'Primary work location for the worker: farm, warehouse, both, or administration';

-- Verify the constraint was added
DO $$
DECLARE
  constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'users_work_location_check' AND conrelid = 'users'::regclass;
  
  IF constraint_def IS NOT NULL THEN
    RAISE NOTICE 'New work_location constraint: %', constraint_def;
  ELSE
    RAISE NOTICE 'Warning: users_work_location_check constraint not found';
  END IF;
END $$;
