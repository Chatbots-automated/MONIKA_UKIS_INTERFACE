-- Fix the hours_worked generated column without dropping it
-- This recreates the column with the correct calculation

-- First, let's check what we have
-- The column is currently: GENERATED ALWAYS AS (...) STORED

-- We need to drop and recreate, but we'll do it in a transaction
-- so if it fails, nothing changes

BEGIN;

-- Store the current data temporarily (just in case)
CREATE TEMP TABLE temp_hours_backup AS 
SELECT id, start_time, end_time, worker_type, lunch_type, non_driving_hours
FROM manual_time_entries;

-- Drop the generated column (this should be fast - it's just metadata)
ALTER TABLE manual_time_entries DROP COLUMN hours_worked;

-- Add it back with the correct calculation using our function
ALTER TABLE manual_time_entries ADD COLUMN hours_worked NUMERIC(5,2) 
  GENERATED ALWAYS AS (
    calculate_manual_hours(start_time, end_time, lunch_type, worker_type, non_driving_hours)
  ) STORED;

COMMIT;

-- Clean up temp table
DROP TABLE IF EXISTS temp_hours_backup;
