-- Worker Portal System Schema
-- Add worker roles, time tracking, and task reporting tables

-- 1. Update users table role constraint to include worker roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'vet', 'tech', 'viewer', 'farm_worker', 'warehouse_worker'));

-- 2. Create worker time entries table
CREATE TABLE IF NOT EXISTS worker_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  work_location text NOT NULL CHECK (work_location IN ('farm', 'warehouse')),
  
  -- Scheduled vs actual times
  scheduled_start time,
  scheduled_end time,
  actual_start_time timestamptz NOT NULL,
  actual_end_time timestamptz,
  
  -- Entry metadata
  date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'approved', 'rejected')),
  notes text,
  
  -- Admin review
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for worker_time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_worker ON worker_time_entries(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON worker_time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_location ON worker_time_entries(work_location);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON worker_time_entries(date);

-- Add comments
COMMENT ON TABLE worker_time_entries IS 'Worker clock in/out time tracking with admin approval workflow';
COMMENT ON COLUMN worker_time_entries.work_location IS 'Work location: farm or warehouse';
COMMENT ON COLUMN worker_time_entries.status IS 'Entry status: active (clocked in), completed (clocked out), approved, rejected';

-- 3. Create worker task reports table
CREATE TABLE IF NOT EXISTS worker_task_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  time_entry_id uuid REFERENCES worker_time_entries(id) ON DELETE CASCADE,
  
  -- Task reference (polymorphic - can reference work orders, maintenance schedules, or farm equipment services)
  task_type text NOT NULL CHECK (task_type IN ('work_order', 'maintenance_schedule', 'farm_equipment_service')),
  task_id uuid NOT NULL,
  
  -- Report details
  completion_status text NOT NULL CHECK (completion_status IN ('completed', 'in_progress', 'blocked')),
  work_description text NOT NULL,
  hours_spent numeric,
  notes text,
  
  -- Admin review
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for worker_task_reports
CREATE INDEX IF NOT EXISTS idx_task_reports_worker ON worker_task_reports(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON worker_task_reports(status);
CREATE INDEX IF NOT EXISTS idx_task_reports_task ON worker_task_reports(task_type, task_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_time_entry ON worker_task_reports(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_created ON worker_task_reports(created_at);

-- Add comments
COMMENT ON TABLE worker_task_reports IS 'Worker task completion reports for work orders, maintenance schedules, and farm equipment services';
COMMENT ON COLUMN worker_task_reports.task_type IS 'Type of task: work_order, maintenance_schedule, or farm_equipment_service';
COMMENT ON COLUMN worker_task_reports.completion_status IS 'Task completion status: completed, in_progress, or blocked';
COMMENT ON COLUMN worker_task_reports.status IS 'Report review status: pending, approved, or rejected';

-- 4. Enable RLS on new tables
ALTER TABLE worker_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_task_reports ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for worker_time_entries
DO $$ 
BEGIN
  -- Workers can view their own time entries, admins can view all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_time_entries' 
    AND policyname = 'Workers view own time entries'
  ) THEN
    CREATE POLICY "Workers view own time entries"
      ON worker_time_entries FOR SELECT
      TO authenticated
      USING (
        worker_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Workers can insert their own time entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_time_entries' 
    AND policyname = 'Workers create own time entries'
  ) THEN
    CREATE POLICY "Workers create own time entries"
      ON worker_time_entries FOR INSERT
      TO authenticated
      WITH CHECK (worker_id = auth.uid());
  END IF;

  -- Only admins can update time entries (for approval/rejection)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_time_entries' 
    AND policyname = 'Admins update time entries'
  ) THEN
    CREATE POLICY "Admins update time entries"
      ON worker_time_entries FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Only admins can delete time entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_time_entries' 
    AND policyname = 'Admins delete time entries'
  ) THEN
    CREATE POLICY "Admins delete time entries"
      ON worker_time_entries FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 6. Create RLS policies for worker_task_reports
DO $$ 
BEGIN
  -- Workers can view their own reports, admins can view all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_task_reports' 
    AND policyname = 'Workers view own task reports'
  ) THEN
    CREATE POLICY "Workers view own task reports"
      ON worker_task_reports FOR SELECT
      TO authenticated
      USING (
        worker_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Workers can insert their own task reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_task_reports' 
    AND policyname = 'Workers create own task reports'
  ) THEN
    CREATE POLICY "Workers create own task reports"
      ON worker_task_reports FOR INSERT
      TO authenticated
      WITH CHECK (worker_id = auth.uid());
  END IF;

  -- Only admins can update task reports (for approval/rejection)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_task_reports' 
    AND policyname = 'Admins update task reports'
  ) THEN
    CREATE POLICY "Admins update task reports"
      ON worker_task_reports FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Only admins can delete task reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_task_reports' 
    AND policyname = 'Admins delete task reports'
  ) THEN
    CREATE POLICY "Admins delete task reports"
      ON worker_task_reports FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 7. Create helper views for admin dashboard

-- View for pending approvals summary
CREATE OR REPLACE VIEW worker_approval_summary AS
SELECT 
  (SELECT COUNT(*) FROM worker_time_entries WHERE status = 'completed') as pending_time_entries,
  (SELECT COUNT(*) FROM worker_task_reports WHERE status = 'pending') as pending_task_reports,
  (SELECT COUNT(DISTINCT worker_id) FROM worker_time_entries WHERE status = 'active') as workers_clocked_in;

-- View for worker time entries with user details
CREATE OR REPLACE VIEW worker_time_entries_detail AS
SELECT 
  wte.*,
  u.full_name as worker_name,
  u.email as worker_email,
  u.work_location as worker_default_location,
  reviewer.full_name as reviewed_by_name,
  EXTRACT(EPOCH FROM (wte.actual_end_time - wte.actual_start_time))/3600 as hours_worked
FROM worker_time_entries wte
JOIN users u ON u.id = wte.worker_id
LEFT JOIN users reviewer ON reviewer.id = wte.reviewed_by
ORDER BY wte.date DESC, wte.created_at DESC;

-- View for worker task reports with details
CREATE OR REPLACE VIEW worker_task_reports_detail AS
SELECT 
  wtr.*,
  u.full_name as worker_name,
  u.email as worker_email,
  reviewer.full_name as reviewed_by_name,
  CASE 
    WHEN wtr.task_type = 'work_order' THEN (
      SELECT work_order_number FROM maintenance_work_orders WHERE id = wtr.task_id
    )
    WHEN wtr.task_type = 'maintenance_schedule' THEN (
      SELECT schedule_name FROM maintenance_schedules WHERE id = wtr.task_id
    )
    WHEN wtr.task_type = 'farm_equipment_service' THEN (
      SELECT item_name FROM farm_equipment_items WHERE id = wtr.task_id
    )
  END as task_name
FROM worker_task_reports wtr
JOIN users u ON u.id = wtr.worker_id
LEFT JOIN users reviewer ON reviewer.id = wtr.reviewed_by
ORDER BY wtr.created_at DESC;

-- Grant permissions on views
GRANT SELECT ON worker_approval_summary TO authenticated;
GRANT SELECT ON worker_time_entries_detail TO authenticated;
GRANT SELECT ON worker_task_reports_detail TO authenticated;

-- 8. Add RLS policies for equipment_products (workers can only see products for their location)
-- Note: This assumes equipment_products table has RLS enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'equipment_products' 
    AND policyname = 'Workers view location products'
  ) THEN
    CREATE POLICY "Workers view location products"
      ON equipment_products FOR SELECT
      TO authenticated
      USING (
        -- Admins, vets, and techs can see all
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'vet', 'tech')
        )
        OR
        -- Farm workers can only see farm products
        (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'farm_worker'
          )
          AND default_location_type = 'farm'
        )
        OR
        -- Warehouse workers can only see warehouse products
        (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'warehouse_worker'
          )
          AND default_location_type = 'warehouse'
        )
        OR
        -- Viewers can see all
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role = 'viewer'
        )
      );
  END IF;
END $$;

-- 9. Add RLS policy for maintenance_work_orders (workers can only see assigned orders)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_work_orders' 
    AND policyname = 'Workers view assigned work orders'
  ) THEN
    CREATE POLICY "Workers view assigned work orders"
      ON maintenance_work_orders FOR SELECT
      TO authenticated
      USING (
        -- Admins, vets, and techs can see all
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'vet', 'tech')
        )
        OR
        -- Workers can only see orders assigned to them
        (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('farm_worker', 'warehouse_worker')
          )
          AND assigned_to = auth.uid()
        )
        OR
        -- Viewers can see all
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role = 'viewer'
        )
      );
  END IF;
END $$;

-- 10. Add RLS policy for maintenance_schedules (workers see schedules based on location)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_schedules' 
    AND policyname = 'Workers view location schedules'
  ) THEN
    CREATE POLICY "Workers view location schedules"
      ON maintenance_schedules FOR SELECT
      TO authenticated
      USING (
        -- Admins, vets, and techs can see all
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'vet', 'tech')
        )
        OR
        -- Workers can see schedules (will be filtered by vehicle/tool location in app)
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('farm_worker', 'warehouse_worker')
        )
        OR
        -- Viewers can see all
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role = 'viewer'
        )
      );
  END IF;
END $$;

-- 11. Add RLS policy for worker_schedules (workers can only see their own schedules)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'worker_schedules' 
    AND policyname = 'Workers view own schedules'
  ) THEN
    CREATE POLICY "Workers view own schedules"
      ON worker_schedules FOR SELECT
      TO authenticated
      USING (
        worker_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'vet', 'tech')
        )
      );
  END IF;
END $$;
