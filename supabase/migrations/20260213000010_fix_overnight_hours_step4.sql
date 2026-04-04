-- Step 4: Update existing rows (this might take time, but it's the last step)
-- If this times out, we can skip it and let the trigger handle new data
UPDATE manual_time_entries
SET hours_worked = calculate_manual_hours(
  start_time,
  end_time,
  lunch_type,
  worker_type,
  non_driving_hours
)
WHERE hours_worked = 0 OR hours_worked IS NULL;

COMMENT ON COLUMN manual_time_entries.hours_worked IS 'Calculated hours: for vairuotojas uses non_driving_hours, for others calculated from start/end with lunch deduction. Handles overnight shifts. Updated via trigger.';
