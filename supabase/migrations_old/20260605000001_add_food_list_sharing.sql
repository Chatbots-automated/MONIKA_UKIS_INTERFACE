-- Create table to track which dates have shared food preference lists for workers
CREATE TABLE IF NOT EXISTS food_list_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  is_shared boolean NOT NULL DEFAULT false,
  shared_by uuid REFERENCES users(id),
  shared_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies
ALTER TABLE food_list_sharing ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage food list sharing"
  ON food_list_sharing
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Workers can view shared dates
CREATE POLICY "Workers can view shared food lists"
  ON food_list_sharing
  FOR SELECT
  TO authenticated
  USING (is_shared = true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_list_sharing_date ON food_list_sharing(date);
CREATE INDEX IF NOT EXISTS idx_food_list_sharing_shared ON food_list_sharing(is_shared);

COMMENT ON TABLE food_list_sharing IS 'Tracks which dates have food preference lists shared with workers';
