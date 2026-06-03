-- ============================================================================
-- FORCE ADD ADMINISTRACIJA ROLE - EXPLICIT VERSION
-- ============================================================================
-- This migration forcefully updates the role constraint to include administracija
-- ============================================================================

-- First, drop the existing constraint (if it exists)
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    RAISE NOTICE 'Dropped existing users_role_check constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop constraint: %', SQLERRM;
END $$;

-- Add the new constraint with administracija included
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN (
    'admin',
    'vet',
    'tech',
    'viewer',
    'farm_worker',
    'warehouse_worker',
    'sandelininkas',
    'buhaltere',
    'administracija',
    'custom'
  ));

-- Verify the constraint was added
DO $$
DECLARE
  constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass;
  
  RAISE NOTICE 'New constraint definition: %', constraint_def;
END $$;

COMMENT ON CONSTRAINT users_role_check ON users IS 'Valid user roles: admin, vet, tech, viewer, farm_worker, warehouse_worker, sandelininkas, buhaltere, administracija, custom';
