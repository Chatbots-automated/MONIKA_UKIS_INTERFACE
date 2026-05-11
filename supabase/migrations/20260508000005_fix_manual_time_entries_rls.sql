-- Check and fix RLS policies for manual_time_entries
-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'manual_time_entries';

-- Show existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'manual_time_entries';

-- Ensure RLS is enabled and policies allow inserts
ALTER TABLE manual_time_entries ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON manual_time_entries;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON manual_time_entries;

-- Create permissive policies
DROP POLICY IF EXISTS "Enable insert for all users" ON manual_time_entries;
CREATE POLICY "Enable insert for all users" ON manual_time_entries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON manual_time_entries;
CREATE POLICY "Enable read access for all users" ON manual_time_entries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable update for all users" ON manual_time_entries;
CREATE POLICY "Enable update for all users" ON manual_time_entries
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON manual_time_entries;
CREATE POLICY "Enable delete for all users" ON manual_time_entries
  FOR DELETE USING (true);
