-- Fix Teat Status RLS for Custom Authentication
-- Run this in Supabase SQL Editor

-- Drop existing policies that require Supabase auth
DROP POLICY IF EXISTS "Authenticated users can view teat status" ON teat_status;
DROP POLICY IF EXISTS "Authenticated users can insert teat status" ON teat_status;
DROP POLICY IF EXISTS "Authenticated users can update teat status" ON teat_status;
DROP POLICY IF EXISTS "Authenticated users can delete teat status" ON teat_status;

-- Create new policies that work with custom authentication
CREATE POLICY "Allow all reads"
  ON teat_status
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts"
  ON teat_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates"
  ON teat_status
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all deletes"
  ON teat_status
  FOR DELETE
  USING (true);
