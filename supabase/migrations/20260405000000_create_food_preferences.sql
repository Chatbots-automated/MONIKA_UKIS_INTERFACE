-- Food Preferences System (Pietūs Module)
-- Allows workers to mark if they want food for each day
-- Admins can view and manage food orders

-- 1. Create worker_food_preferences table
CREATE TABLE IF NOT EXISTS worker_food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  wants_food boolean DEFAULT false,
  work_location text CHECK (work_location IN ('farm', 'warehouse')),
  
  -- Tracking
  marked_at timestamptz,
  marked_by uuid REFERENCES users(id), -- worker themselves or admin override
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One preference per worker per day
  UNIQUE(worker_id, date)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_prefs_worker_date ON worker_food_preferences(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_food_prefs_date ON worker_food_preferences(date);
CREATE INDEX IF NOT EXISTS idx_food_prefs_location ON worker_food_preferences(work_location);
CREATE INDEX IF NOT EXISTS idx_food_prefs_wants_food ON worker_food_preferences(wants_food, date);

-- 3. Add comments
COMMENT ON TABLE worker_food_preferences IS 'Worker food preferences - tracks who wants food each day';
COMMENT ON COLUMN worker_food_preferences.wants_food IS 'True if worker wants food for this date';
COMMENT ON COLUMN worker_food_preferences.work_location IS 'Work location: farm or warehouse';
COMMENT ON COLUMN worker_food_preferences.marked_by IS 'User who marked the preference (worker or admin)';

-- 4. Disable RLS (using custom auth system)
ALTER TABLE worker_food_preferences DISABLE ROW LEVEL SECURITY;

-- 5. Create view for daily food summary
CREATE OR REPLACE VIEW daily_food_summary AS
SELECT 
  fp.date,
  fp.work_location,
  COUNT(*) FILTER (WHERE fp.wants_food = true) as total_wanting_food,
  COUNT(*) FILTER (WHERE fp.wants_food = false) as total_not_wanting_food,
  COUNT(*) as total_responses,
  jsonb_agg(
    jsonb_build_object(
      'worker_id', u.id,
      'worker_name', u.full_name,
      'wants_food', fp.wants_food,
      'marked_at', fp.marked_at
    ) ORDER BY u.full_name
  ) FILTER (WHERE fp.wants_food = true) as workers_wanting_food,
  jsonb_agg(
    jsonb_build_object(
      'worker_id', u.id,
      'worker_name', u.full_name,
      'wants_food', fp.wants_food,
      'marked_at', fp.marked_at
    ) ORDER BY u.full_name
  ) as all_responses
FROM worker_food_preferences fp
JOIN users u ON fp.worker_id = u.id
GROUP BY fp.date, fp.work_location;

COMMENT ON VIEW daily_food_summary IS 'Daily summary of food preferences by location';

-- 6. Grant permissions
GRANT ALL ON worker_food_preferences TO anon;
GRANT ALL ON worker_food_preferences TO authenticated;
GRANT ALL ON worker_food_preferences TO service_role;
GRANT SELECT ON daily_food_summary TO anon;
GRANT SELECT ON daily_food_summary TO authenticated;
GRANT SELECT ON daily_food_summary TO service_role;

-- 7. Create function to bulk set food preferences for a week
CREATE OR REPLACE FUNCTION set_weekly_food_preferences(
  p_worker_id uuid,
  p_start_date date,
  p_end_date date,
  p_wants_food boolean,
  p_work_location text
)
RETURNS void AS $$
DECLARE
  v_date date;
BEGIN
  -- Loop through each date in the range
  FOR v_date IN 
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    -- Insert or update preference
    INSERT INTO worker_food_preferences (
      worker_id,
      date,
      wants_food,
      work_location,
      marked_at,
      marked_by
    ) VALUES (
      p_worker_id,
      v_date,
      p_wants_food,
      p_work_location,
      now(),
      p_worker_id
    )
    ON CONFLICT (worker_id, date) 
    DO UPDATE SET
      wants_food = EXCLUDED.wants_food,
      work_location = EXCLUDED.work_location,
      marked_at = EXCLUDED.marked_at,
      marked_by = EXCLUDED.marked_by,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_weekly_food_preferences IS 'Bulk set food preferences for a worker for a date range';
