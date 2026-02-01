# Fix Technika Module Issues

## Issues Fixed
1. Tool checkout fails with foreign key constraint error
2. Work order creation fails with 404 error (missing RPC function)
3. Maintenance status shows "reikia aptarnauti" even after completion

## How to Apply

1. Go to your Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new

2. Copy and paste the SQL below
3. Click "Run"

## SQL Migration

```sql
-- ============================================================================
-- Fix Technika Module Issues
-- ============================================================================

-- 1. Fix tool_movements foreign keys (point to public.users instead of auth.users)
ALTER TABLE tool_movements DROP CONSTRAINT IF EXISTS tool_movements_to_holder_fkey;
ALTER TABLE tool_movements DROP CONSTRAINT IF EXISTS tool_movements_from_holder_fkey;
ALTER TABLE tool_movements DROP CONSTRAINT IF EXISTS tool_movements_recorded_by_fkey;

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_to_holder_fkey
  FOREIGN KEY (to_holder) REFERENCES users(id);

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_from_holder_fkey
  FOREIGN KEY (from_holder) REFERENCES users(id);

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES users(id);

-- 2. Create generate_work_order_number RPC function
-- Drop existing function first if it exists with different return type
DROP FUNCTION IF EXISTS generate_work_order_number();

CREATE FUNCTION generate_work_order_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_number text;
BEGIN
  -- Get the next work order number
  SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 'WO-(.*)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM maintenance_work_orders
  WHERE work_order_number ~ '^WO-[0-9]+$';

  -- Format as WO-000001, WO-000002, etc.
  new_number := 'WO-' || LPAD(next_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure maintenance_work_orders has status column
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

-- 4. Ensure maintenance_work_orders has completed_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_work_orders' AND column_name = 'completed_date'
  ) THEN
    ALTER TABLE maintenance_work_orders
    ADD COLUMN completed_date timestamptz;
  END IF;
END $$;

-- 5. Create trigger to update schedule when work order is completed
CREATE OR REPLACE FUNCTION update_schedule_on_work_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (when work order is created as 'completed')
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.schedule_id IS NOT NULL THEN
    UPDATE maintenance_schedules
    SET last_completed_date = COALESCE(NEW.completed_date, NEW.created_at, NOW())
    WHERE id = NEW.schedule_id;
    RETURN NEW;
  END IF;

  -- Handle UPDATE (when work order status changes to 'completed')
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.schedule_id IS NOT NULL THEN
    UPDATE maintenance_schedules
    SET last_completed_date = COALESCE(NEW.completed_date, NOW())
    WHERE id = NEW.schedule_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_schedule_on_complete ON maintenance_work_orders;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_update_schedule_on_complete
  AFTER INSERT OR UPDATE OF status ON maintenance_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_on_work_order_complete();

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_number
  ON maintenance_work_orders(work_order_number);

CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_status
  ON maintenance_work_orders(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_schedule
  ON maintenance_work_orders(schedule_id);

-- 7. Update any existing completed work orders to update their schedules
DO $$
DECLARE
  wo_record RECORD;
BEGIN
  FOR wo_record IN
    SELECT id, schedule_id, completed_date, created_at
    FROM maintenance_work_orders
    WHERE status = 'completed' AND schedule_id IS NOT NULL
  LOOP
    UPDATE maintenance_schedules
    SET last_completed_date = COALESCE(wo_record.completed_date, wo_record.created_at, NOW())
    WHERE id = wo_record.schedule_id;
  END LOOP;
END $$;
```

## Verification

After running the SQL, verify the fixes:

1. Tool checkout should work without errors
2. Creating work orders should work (no 404 error)
3. Completed maintenance should update schedule status correctly
