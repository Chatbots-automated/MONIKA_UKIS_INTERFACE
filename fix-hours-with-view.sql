-- Alternative approach: Create a view that calculates hours correctly
-- This doesn't modify the table at all, so it won't timeout

-- Create or replace a view that shows the correct hours
CREATE OR REPLACE VIEW manual_time_entries_corrected AS
SELECT 
  id,
  worker_id,
  entry_date,
  start_time,
  end_time,
  worker_type,
  lunch_type,
  work_description,
  measurement_value,
  measurement_unit_id,
  comments,
  non_driving_hours,
  notes,
  entered_by,
  created_at,
  updated_at,
  -- Use our function to calculate correct hours
  calculate_manual_hours(start_time, end_time, lunch_type, worker_type, non_driving_hours) as hours_worked_correct,
  -- Keep the old column for reference
  hours_worked as hours_worked_old
FROM manual_time_entries;

-- Grant permissions
GRANT SELECT ON manual_time_entries_corrected TO anon, authenticated, service_role;

COMMENT ON VIEW manual_time_entries_corrected IS 'View of manual_time_entries with correctly calculated hours (handles overnight shifts)';
