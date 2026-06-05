-- Drop the old table and start fresh with a better approach for custom auth
DROP TABLE IF EXISTS food_list_sharing CASCADE;

-- Create a simpler table that tracks which workers can see which dates
CREATE TABLE IF NOT EXISTS food_list_shared_with_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  worker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(date, worker_id)
);

-- Disable RLS since we're using custom auth
ALTER TABLE food_list_shared_with_workers DISABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_shared_date ON food_list_shared_with_workers(date);
CREATE INDEX IF NOT EXISTS idx_food_shared_worker ON food_list_shared_with_workers(worker_id);

COMMENT ON TABLE food_list_shared_with_workers IS 'Tracks which workers can see food preference lists for specific dates (custom auth compatible)';
