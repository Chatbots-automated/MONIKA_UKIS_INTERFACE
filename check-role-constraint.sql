-- ============================================================================
-- CHECK CURRENT ROLE CONSTRAINT
-- ============================================================================
-- Run this to see what the current constraint looks like
-- ============================================================================

-- Check the current constraint definition
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'users_role_check' 
  AND conrelid = 'users'::regclass;

-- List all constraints on the users table
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
ORDER BY conname;
