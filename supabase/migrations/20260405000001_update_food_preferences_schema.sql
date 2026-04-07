-- Update Food Preferences System to support lunch and supper separately
-- This migration updates the existing schema

-- 1. Drop the old view first
DROP VIEW IF EXISTS daily_food_summary;

-- 2. Drop the old function
DROP FUNCTION IF EXISTS set_weekly_food_preferences(uuid, date, date, boolean, text);

-- 3. Check if table exists and alter it, or create new
DO $$ 
BEGIN
  -- Check if wants_food column exists (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'worker_food_preferences' 
    AND column_name = 'wants_food'
  ) THEN
    -- Old schema exists, update it
    ALTER TABLE worker_food_preferences 
      DROP COLUMN IF EXISTS wants_food,
      ADD COLUMN IF NOT EXISTS wants_lunch boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS wants_supper boolean DEFAULT false;
    
    -- Update work_location constraint
    ALTER TABLE worker_food_preferences 
      DROP CONSTRAINT IF EXISTS worker_food_preferences_work_location_check;
    
    ALTER TABLE worker_food_preferences 
      ADD CONSTRAINT worker_food_preferences_work_location_check 
      CHECK (work_location IN ('farm', 'warehouse', 'administration'));
  ELSE
    -- Table doesn't exist or already has new schema, create it
    CREATE TABLE IF NOT EXISTS worker_food_preferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      date date NOT NULL,
      wants_lunch boolean DEFAULT false,
      wants_supper boolean DEFAULT false,
      work_location text CHECK (work_location IN ('farm', 'warehouse', 'administration')),
      marked_at timestamptz,
      marked_by uuid REFERENCES users(id),
      notes text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(worker_id, date)
    );
  END IF;
END $$;

-- 4. Create admin manual food counts table
CREATE TABLE IF NOT EXISTS admin_food_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  location text NOT NULL CHECK (location IN ('farm', 'warehouse', 'administration')),
  lunch_count integer DEFAULT 0,
  supper_count integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, location)
);

-- 5. Add/update indexes
DROP INDEX IF EXISTS idx_food_prefs_wants_food;

CREATE INDEX IF NOT EXISTS idx_food_prefs_worker_date ON worker_food_preferences(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_food_prefs_date ON worker_food_preferences(date);
CREATE INDEX IF NOT EXISTS idx_food_prefs_location ON worker_food_preferences(work_location);
CREATE INDEX IF NOT EXISTS idx_food_prefs_wants_lunch ON worker_food_preferences(wants_lunch, date);
CREATE INDEX IF NOT EXISTS idx_food_prefs_wants_supper ON worker_food_preferences(wants_supper, date);

CREATE INDEX IF NOT EXISTS idx_admin_counts_date ON admin_food_counts(date);
CREATE INDEX IF NOT EXISTS idx_admin_counts_location ON admin_food_counts(location);

-- 6. Add comments
COMMENT ON TABLE worker_food_preferences IS 'Worker food preferences - tracks who wants lunch and supper each day';
COMMENT ON COLUMN worker_food_preferences.wants_lunch IS 'True if worker wants lunch for this date';
COMMENT ON COLUMN worker_food_preferences.wants_supper IS 'True if worker wants supper for this date';
COMMENT ON COLUMN worker_food_preferences.work_location IS 'Work location: farm, warehouse, or administration';
COMMENT ON COLUMN worker_food_preferences.marked_by IS 'User who marked the preference (worker or admin)';

COMMENT ON TABLE admin_food_counts IS 'Manual food counts entered by admin for administration and other locations';
COMMENT ON COLUMN admin_food_counts.lunch_count IS 'Number of people wanting lunch';
COMMENT ON COLUMN admin_food_counts.supper_count IS 'Number of people wanting supper';

-- 7. Disable RLS (using custom auth system)
ALTER TABLE worker_food_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_food_counts DISABLE ROW LEVEL SECURITY;

-- 8. Create updated view for daily food summary
CREATE OR REPLACE VIEW daily_food_summary AS
SELECT 
  fp.date,
  fp.work_location,
  COUNT(*) FILTER (WHERE fp.wants_lunch = true) as total_wanting_lunch,
  COUNT(*) FILTER (WHERE fp.wants_supper = true) as total_wanting_supper,
  COUNT(*) as total_responses,
  jsonb_agg(
    jsonb_build_object(
      'worker_id', u.id,
      'worker_name', u.full_name,
      'wants_lunch', fp.wants_lunch,
      'wants_supper', fp.wants_supper,
      'marked_at', fp.marked_at
    ) ORDER BY u.full_name
  ) as all_responses
FROM worker_food_preferences fp
JOIN users u ON fp.worker_id = u.id
GROUP BY fp.date, fp.work_location;

COMMENT ON VIEW daily_food_summary IS 'Daily summary of lunch and supper preferences by location';

-- 9. Grant permissions
GRANT ALL ON worker_food_preferences TO anon;
GRANT ALL ON worker_food_preferences TO authenticated;
GRANT ALL ON worker_food_preferences TO service_role;
GRANT ALL ON admin_food_counts TO anon;
GRANT ALL ON admin_food_counts TO authenticated;
GRANT ALL ON admin_food_counts TO service_role;
GRANT SELECT ON daily_food_summary TO anon;
GRANT SELECT ON daily_food_summary TO authenticated;
GRANT SELECT ON daily_food_summary TO service_role;

-- 10. Create updated function to bulk set food preferences for a week
CREATE OR REPLACE FUNCTION set_weekly_food_preferences(
  p_worker_id uuid,
  p_start_date date,
  p_end_date date,
  p_wants_lunch boolean,
  p_wants_supper boolean,
  p_work_location text
)
RETURNS void AS $$
DECLARE
  v_date date;
BEGIN
  FOR v_date IN 
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    INSERT INTO worker_food_preferences (
      worker_id,
      date,
      wants_lunch,
      wants_supper,
      work_location,
      marked_at,
      marked_by
    ) VALUES (
      p_worker_id,
      v_date,
      p_wants_lunch,
      p_wants_supper,
      p_work_location,
      now(),
      p_worker_id
    )
    ON CONFLICT (worker_id, date) 
    DO UPDATE SET
      wants_lunch = EXCLUDED.wants_lunch,
      wants_supper = EXCLUDED.wants_supper,
      work_location = EXCLUDED.work_location,
      marked_at = EXCLUDED.marked_at,
      marked_by = EXCLUDED.marked_by,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_weekly_food_preferences IS 'Bulk set lunch and supper preferences for a worker for a date range';
