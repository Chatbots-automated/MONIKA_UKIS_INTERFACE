-- Check if the function exists
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS parameters,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'gea_daily_upload';
