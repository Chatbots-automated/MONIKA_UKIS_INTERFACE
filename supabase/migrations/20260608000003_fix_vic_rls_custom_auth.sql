-- ============================================
-- Fix VIC RLS for Custom Auth
-- Disable RLS entirely since custom auth handles authorization
-- ============================================

BEGIN;

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view VIC credentials" ON public.vic_credentials;
DROP POLICY IF EXISTS "Admins can insert VIC credentials" ON public.vic_credentials;
DROP POLICY IF EXISTS "Admins can update VIC credentials" ON public.vic_credentials;
DROP POLICY IF EXISTS "Admins can delete VIC credentials" ON public.vic_credentials;
DROP POLICY IF EXISTS "Allow all operations on VIC credentials" ON public.vic_credentials;

DROP POLICY IF EXISTS "Admins can view VIC clients" ON public.vic_clients;
DROP POLICY IF EXISTS "Admins can insert VIC clients" ON public.vic_clients;
DROP POLICY IF EXISTS "Admins can update VIC clients" ON public.vic_clients;
DROP POLICY IF EXISTS "Admins can delete VIC clients" ON public.vic_clients;
DROP POLICY IF EXISTS "Allow all operations on VIC clients" ON public.vic_clients;

-- Disable RLS for VIC tables
ALTER TABLE public.vic_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vic_clients DISABLE ROW LEVEL SECURITY;

-- Ensure proper grants
GRANT ALL ON public.vic_credentials TO authenticated, anon;
GRANT ALL ON public.vic_clients TO authenticated, anon;

COMMIT;
