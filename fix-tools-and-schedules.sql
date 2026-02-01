/*
  # Fix Tools Foreign Key and Maintenance Schedule Updates

  ## Overview
  This migration fixes two critical issues:

  1. Tools Foreign Key Issue
     - The `tools.current_holder` column has a foreign key pointing to `auth.users`
     - This should point to `public.users` (our custom auth system)
     - Drop the incorrect constraint and create a new one

  2. Maintenance Schedule Updates
     - When a work order is completed, the schedule should calculate the next due date
     - Currently only updates last_performed_date but doesn't calculate next_due_date
     - Update trigger to calculate next service date based on interval

  ## Changes

  1. Fix tools.current_holder foreign key
     - Drop tools_current_holder_fkey if it exists
     - Create new constraint pointing to public.users

  2. Update maintenance schedule trigger
     - Calculate next_due_date based on interval_type and interval_value
     - Handle date, mileage, and hours-based intervals
*/

-- 1. Fix tools.current_holder foreign key constraint
ALTER TABLE tools DROP CONSTRAINT IF EXISTS tools_current_holder_fkey;

ALTER TABLE tools
  ADD CONSTRAINT tools_current_holder_fkey
  FOREIGN KEY (current_holder) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Update trigger to calculate next service date for maintenance schedules
CREATE OR REPLACE FUNCTION update_schedule_on_work_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_schedule RECORD;
BEGIN
  -- Handle INSERT (when work order is created as 'completed')
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.schedule_id IS NOT NULL THEN
    -- Get the schedule details
    SELECT * INTO v_schedule
    FROM maintenance_schedules
    WHERE id = NEW.schedule_id;

    -- Update last_performed_date and calculate next_due_date
    UPDATE maintenance_schedules
    SET
      last_performed_date = COALESCE(NEW.completed_date, NEW.created_at, NOW()),
      -- Calculate next_due_date based on interval_type
      next_due_date = CASE
        WHEN v_schedule.interval_type = 'date' THEN
          (COALESCE(NEW.completed_date, NEW.created_at, NOW()) + (v_schedule.interval_value || ' days')::interval)::date
        ELSE
          v_schedule.next_due_date -- Keep existing for mileage/hours
      END,
      -- Update mileage if applicable
      last_performed_mileage = CASE
        WHEN v_schedule.interval_type = 'mileage' THEN
          (SELECT current_mileage FROM vehicles WHERE id = v_schedule.vehicle_id)
        ELSE v_schedule.last_performed_mileage
      END,
      next_due_mileage = CASE
        WHEN v_schedule.interval_type = 'mileage' THEN
          (SELECT current_mileage FROM vehicles WHERE id = v_schedule.vehicle_id) + v_schedule.interval_value
        ELSE v_schedule.next_due_mileage
      END,
      -- Update hours if applicable
      last_performed_hours = CASE
        WHEN v_schedule.interval_type = 'hours' THEN
          (SELECT current_hours FROM vehicles WHERE id = v_schedule.vehicle_id)
        ELSE v_schedule.last_performed_hours
      END,
      next_due_hours = CASE
        WHEN v_schedule.interval_type = 'hours' THEN
          (SELECT current_hours FROM vehicles WHERE id = v_schedule.vehicle_id) + v_schedule.interval_value
        ELSE v_schedule.next_due_hours
      END
    WHERE id = NEW.schedule_id;

    RETURN NEW;
  END IF;

  -- Handle UPDATE (when work order status changes to 'completed')
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.schedule_id IS NOT NULL THEN
    -- Get the schedule details
    SELECT * INTO v_schedule
    FROM maintenance_schedules
    WHERE id = NEW.schedule_id;

    -- Update last_performed_date and calculate next_due_date
    UPDATE maintenance_schedules
    SET
      last_performed_date = COALESCE(NEW.completed_date, NOW()),
      -- Calculate next_due_date based on interval_type
      next_due_date = CASE
        WHEN v_schedule.interval_type = 'date' THEN
          (COALESCE(NEW.completed_date, NOW()) + (v_schedule.interval_value || ' days')::interval)::date
        ELSE
          v_schedule.next_due_date -- Keep existing for mileage/hours
      END,
      -- Update mileage if applicable
      last_performed_mileage = CASE
        WHEN v_schedule.interval_type = 'mileage' THEN
          (SELECT current_mileage FROM vehicles WHERE id = v_schedule.vehicle_id)
        ELSE v_schedule.last_performed_mileage
      END,
      next_due_mileage = CASE
        WHEN v_schedule.interval_type = 'mileage' THEN
          (SELECT current_mileage FROM vehicles WHERE id = v_schedule.vehicle_id) + v_schedule.interval_value
        ELSE v_schedule.next_due_mileage
      END,
      -- Update hours if applicable
      last_performed_hours = CASE
        WHEN v_schedule.interval_type = 'hours' THEN
          (SELECT current_hours FROM vehicles WHERE id = v_schedule.vehicle_id)
        ELSE v_schedule.last_performed_hours
      END,
      next_due_hours = CASE
        WHEN v_schedule.interval_type = 'hours' THEN
          (SELECT current_hours FROM vehicles WHERE id = v_schedule.vehicle_id) + v_schedule.interval_value
        ELSE v_schedule.next_due_hours
      END
    WHERE id = NEW.schedule_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_schedule_on_complete ON maintenance_work_orders;

CREATE TRIGGER trigger_update_schedule_on_complete
  AFTER INSERT OR UPDATE OF status ON maintenance_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_on_work_order_complete();
