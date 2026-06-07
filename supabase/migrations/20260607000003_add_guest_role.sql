-- Add 'guest' role to the users table role constraint
-- This allows users to log in but have no module access by default

-- Drop the old constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with 'guest' role included
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY[
  'admin'::text, 
  'vet'::text, 
  'tech'::text, 
  'viewer'::text, 
  'guest'::text,
  'farm_worker'::text,
  'warehouse_worker'::text,
  'buhaltere'::text,
  'sandelininkas'::text,
  'administracija'::text,
  'custom'::text
]));

-- Add comment explaining the guest role
COMMENT ON COLUMN public.users.role IS 'User role: admin (full access), vet (veterinary full access), tech (limited access), viewer (read-only), guest (login only, no module access), custom (custom permissions)';
