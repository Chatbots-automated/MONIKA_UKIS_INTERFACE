-- Fix RLS policies for economic groups
-- Run this in Supabase SQL Editor after the main migration
-- Uses custom auth (not Supabase auth.users)

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read economic groups" ON public.economic_groups;
DROP POLICY IF EXISTS "Allow authenticated users to insert economic groups" ON public.economic_groups;
DROP POLICY IF EXISTS "Allow authenticated users to update economic groups" ON public.economic_groups;

-- Disable RLS temporarily
ALTER TABLE public.economic_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_departures DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.economic_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_departures ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all operations (you handle auth in app)
CREATE POLICY "Allow all for economic_groups"
  ON public.economic_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for economic_groups anon"
  ON public.economic_groups
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Update policy for animal_departures
DROP POLICY IF EXISTS "Allow authenticated users to read animal departures" ON public.animal_departures;
DROP POLICY IF EXISTS "Allow anon to insert animal departures (for N8N)" ON public.animal_departures;
DROP POLICY IF EXISTS "Allow anon to update animal departures (for N8N)" ON public.animal_departures;

CREATE POLICY "Allow all for animal_departures"
  ON public.animal_departures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for animal_departures anon"
  ON public.animal_departures
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

