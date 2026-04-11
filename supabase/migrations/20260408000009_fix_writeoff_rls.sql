-- Fix RLS policies for write_off_acts to allow inserts
-- The issue is that the INSERT policy was too restrictive

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to create write-off acts" ON public.write_off_acts;
DROP POLICY IF EXISTS "Allow authenticated users to create write-off act items" ON public.write_off_act_items;

-- Recreate INSERT policies with proper permissions
CREATE POLICY "Allow authenticated users to create write-off acts"
ON public.write_off_acts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to create write-off act items"
ON public.write_off_act_items FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Also ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION generate_write_off_act_number(TEXT) TO authenticated;
