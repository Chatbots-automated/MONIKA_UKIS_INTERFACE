-- Step 1: Drop the generated column (fast operation)
ALTER TABLE manual_time_entries DROP COLUMN IF EXISTS hours_worked;

-- Add hours_worked as a regular numeric column
ALTER TABLE manual_time_entries ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(5,2) DEFAULT 0;
