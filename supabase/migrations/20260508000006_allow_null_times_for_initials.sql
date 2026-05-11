-- Allow NULL values for start_time and end_time in manual_time_entries
-- This is needed when entries have initials (like sick days) without actual work times

ALTER TABLE manual_time_entries 
  ALTER COLUMN start_time DROP NOT NULL;

ALTER TABLE manual_time_entries 
  ALTER COLUMN end_time DROP NOT NULL;
