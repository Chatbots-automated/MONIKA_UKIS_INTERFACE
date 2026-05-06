-- Fix RLS policies for hoof_records to work with custom auth (anon role)
-- The table already has GRANT ALL to anon, but RLS policies were only for authenticated role

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Anon can view hoof records" ON public.hoof_records;
DROP POLICY IF EXISTS "Anon can create hoof records" ON public.hoof_records;
DROP POLICY IF EXISTS "Anon can update hoof records" ON public.hoof_records;
DROP POLICY IF EXISTS "Anon can delete hoof records" ON public.hoof_records;

-- Add policies for anon role (custom auth uses anon with session management)
CREATE POLICY "Anon can view hoof records" 
ON public.hoof_records 
FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Anon can create hoof records" 
ON public.hoof_records 
FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Anon can update hoof records" 
ON public.hoof_records 
FOR UPDATE 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Anon can delete hoof records" 
ON public.hoof_records 
FOR DELETE 
TO anon 
USING (true);

-- Also ensure the hoof_condition_codes table is accessible
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hoof_condition_codes TO anon;
