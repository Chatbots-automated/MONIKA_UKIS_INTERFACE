-- ============================================================================
-- ADD ADMINISTRACIJA ROLE
-- ============================================================================
-- This migration adds the new administracija role for administration workers
-- who use the food preferences system
-- ============================================================================

-- Update the role check constraint to include administracija role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role = ANY (ARRAY[
    'admin'::text,
    'vet'::text,
    'tech'::text,
    'viewer'::text,
    'farm_worker'::text,
    'warehouse_worker'::text,
    'sandelininkas'::text,
    'buhaltere'::text,
    'administracija'::text,
    'custom'::text
  ]));

COMMENT ON CONSTRAINT users_role_check ON users IS 'Valid user roles including secretary, warehouse manager, and administration';

-- ============================================================================
-- NOTES
-- ============================================================================
-- administracija (Administration):
--   - Can use worker login codes
--   - Can mark food preferences (lunch/dinner)
--   - Uses work_location = 'administration'
--   - Will be expanded with more features in the future
-- ============================================================================
