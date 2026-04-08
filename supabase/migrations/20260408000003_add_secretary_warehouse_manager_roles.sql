-- ============================================================================
-- ADD SECRETARY AND WAREHOUSE MANAGER ROLES
-- ============================================================================
-- This migration adds two new roles: buhaltere (secretary) and sandelininkas (warehouse manager)
-- Both roles have full access to the Technika module
-- ============================================================================

-- Update the role check constraint to include new roles
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
    'custom'::text
  ]));

COMMENT ON CONSTRAINT users_role_check ON users IS 'Valid user roles including secretary and warehouse manager';

-- ============================================================================
-- NOTES
-- ============================================================================
-- sandelininkas (Warehouse Manager):
--   - Full access to Technika module
--   - Can upload invoices and assign items
--   - Can view all invoices and assignments
--
-- buhaltere (Secretary):
--   - Full access to Technika module
--   - Can view all invoices and where items were assigned
--   - Exclusive access to Eksportuoti section with L0 fields
--
-- admin:
--   - Can see everything
-- ============================================================================
