-- Fix RLS policies for write_off_acts to work with custom auth
-- The system uses custom auth with users table, not auth.users

-- Disable RLS temporarily to allow all operations
ALTER TABLE public.write_off_acts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.write_off_act_items DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled, use these policies instead:
-- DROP ALL existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view write-off acts" ON public.write_off_acts;
DROP POLICY IF EXISTS "Allow authenticated users to view write-off act items" ON public.write_off_act_items;
DROP POLICY IF EXISTS "Allow authenticated users to create write-off acts" ON public.write_off_acts;
DROP POLICY IF EXISTS "Allow authenticated users to create write-off act items" ON public.write_off_act_items;
DROP POLICY IF EXISTS "Allow users to update draft write-off acts" ON public.write_off_acts;
DROP POLICY IF EXISTS "Allow users to update draft write-off act items" ON public.write_off_act_items;
DROP POLICY IF EXISTS "Allow users to delete draft write-off acts" ON public.write_off_acts;
DROP POLICY IF EXISTS "Allow users to delete draft write-off act items" ON public.write_off_act_items;

-- Re-enable RLS
ALTER TABLE public.write_off_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.write_off_act_items ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all authenticated users (since you handle auth in app)
CREATE POLICY "Allow all for write_off_acts"
ON public.write_off_acts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for write_off_act_items"
ON public.write_off_act_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Make sure anon role can also access (if needed)
CREATE POLICY "Allow all for write_off_acts anon"
ON public.write_off_acts
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for write_off_act_items anon"
ON public.write_off_act_items
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
