-- Check for duplicate emails in the users table
SELECT email, COUNT(*) as count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Show all users with their emails (to see what exists)
SELECT id, email, full_name, role, created_at
FROM public.users
ORDER BY created_at DESC;
