-- Step 3: Create the trigger
CREATE OR REPLACE FUNCTION update_manual_hours_worked()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hours_worked := calculate_manual_hours(
    NEW.start_time,
    NEW.end_time,
    NEW.lunch_type,
    NEW.worker_type,
    NEW.non_driving_hours
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_manual_hours_worked ON manual_time_entries;

CREATE TRIGGER trg_update_manual_hours_worked
  BEFORE INSERT OR UPDATE ON manual_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_hours_worked();
