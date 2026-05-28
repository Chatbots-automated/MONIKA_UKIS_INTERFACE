-- Create day_type_initials table for special day markers (sick, vacation, etc.)
CREATE TABLE day_type_initials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_location TEXT NOT NULL CHECK (work_location IN ('farm', 'warehouse', 'both')),
  initial TEXT NOT NULL CHECK (length(initial) <= 3),
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies (matching the pattern used in other tables)
ALTER TABLE day_type_initials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON day_type_initials
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON day_type_initials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON day_type_initials
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON day_type_initials
  FOR DELETE USING (true);

-- Add unique constraint
CREATE UNIQUE INDEX day_type_initials_location_initial_idx 
  ON day_type_initials(work_location, initial) 
  WHERE is_active = true;

-- Add day_type_initial_id to manual_time_entries table
ALTER TABLE manual_time_entries 
  ADD COLUMN day_type_initial_id UUID REFERENCES day_type_initials(id);

-- Add index for faster lookups
CREATE INDEX manual_time_entries_day_type_initial_id_idx 
  ON manual_time_entries(day_type_initial_id);

-- Insert some default initials
INSERT INTO day_type_initials (work_location, initial, description) VALUES
  ('both', 'L', 'Liga'),
  ('both', 'A', 'Atostogos'),
  ('both', 'ND', 'Nedarbingumo');
