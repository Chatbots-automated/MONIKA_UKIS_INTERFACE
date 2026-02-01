-- Fix tool_movements foreign key constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tool_movements_to_holder_fkey'
  ) THEN
    ALTER TABLE tool_movements DROP CONSTRAINT tool_movements_to_holder_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tool_movements_from_holder_fkey'
  ) THEN
    ALTER TABLE tool_movements DROP CONSTRAINT tool_movements_from_holder_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tool_movements_recorded_by_fkey'
  ) THEN
    ALTER TABLE tool_movements DROP CONSTRAINT tool_movements_recorded_by_fkey;
  END IF;
END $$;

-- Add new foreign keys to public.users (not auth.users)
ALTER TABLE tool_movements
ADD CONSTRAINT tool_movements_to_holder_fkey
FOREIGN KEY (to_holder) REFERENCES users(id);

ALTER TABLE tool_movements
ADD CONSTRAINT tool_movements_from_holder_fkey
FOREIGN KEY (from_holder) REFERENCES users(id);

ALTER TABLE tool_movements
ADD CONSTRAINT tool_movements_recorded_by_fkey
FOREIGN KEY (recorded_by) REFERENCES users(id);

-- Create generate_work_order_number RPC function
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 'WO-(.*)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM maintenance_work_orders;

  new_number := 'WO-' || LPAD(next_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Ensure maintenance_work_orders has status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_work_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE maintenance_work_orders
    ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Add constraint for status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'maintenance_work_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE maintenance_work_orders
    ADD CONSTRAINT maintenance_work_orders_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_number
ON maintenance_work_orders(work_order_number);

CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_status
ON maintenance_work_orders(status);

-- Create function to update schedule when work order completes
CREATE OR REPLACE FUNCTION update_schedule_on_work_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.schedule_id IS NOT NULL THEN
    UPDATE maintenance_schedules
    SET last_completed_date = NEW.completed_date
    WHERE id = NEW.schedule_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_schedule_on_complete ON maintenance_work_orders;

CREATE TRIGGER trigger_update_schedule_on_complete
  AFTER UPDATE OF status ON maintenance_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_on_work_order_complete();
