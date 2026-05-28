-- Fix day_type_initials RLS policies
-- Drop existing policies with wrong auth check
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON day_type_initials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON day_type_initials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON day_type_initials;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON day_type_initials;

-- Create new policies that work with custom auth
CREATE POLICY "Enable read access for all users" ON day_type_initials
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON day_type_initials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON day_type_initials
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON day_type_initials
  FOR DELETE USING (true);

-- Also add the column to manual_time_entries if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manual_time_entries' 
    AND column_name = 'day_type_initial_id'
  ) THEN
    ALTER TABLE manual_time_entries 
      ADD COLUMN day_type_initial_id UUID REFERENCES day_type_initials(id);
    
    CREATE INDEX manual_time_entries_day_type_initial_id_idx 
      ON manual_time_entries(day_type_initial_id);
  END IF;
END $$;

-- Insert default initials if they don't exist
INSERT INTO day_type_initials (work_location, initial, description) 
VALUES
  ('both', 'L', 'Liga'),
  ('both', 'A', 'Atostogos'),
  ('both', 'ND', 'Nedarbingumo')
ON CONFLICT DO NOTHING;
