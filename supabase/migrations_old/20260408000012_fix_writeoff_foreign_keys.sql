-- Fix foreign key constraints to reference public.users instead of auth.users
-- The system uses custom auth with users table in public schema

-- Drop existing foreign key constraints
ALTER TABLE public.write_off_acts 
DROP CONSTRAINT IF EXISTS write_off_acts_created_by_fkey;

ALTER TABLE public.write_off_acts 
DROP CONSTRAINT IF EXISTS write_off_acts_approved_by_fkey;

-- Add new foreign key constraints referencing public.users
ALTER TABLE public.write_off_acts
ADD CONSTRAINT write_off_acts_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.write_off_acts
ADD CONSTRAINT write_off_acts_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
