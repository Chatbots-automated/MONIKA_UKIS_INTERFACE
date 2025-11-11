-- TRUNCATE ALL TABLES
-- WARNING: This will delete ALL data from all tables while keeping the structure
-- Use with extreme caution!

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = 'replica';

-- Truncate all main tables (order matters due to foreign keys)
TRUNCATE TABLE public.usage_items CASCADE;
TRUNCATE TABLE public.treatment_courses CASCADE;
TRUNCATE TABLE public.treatments CASCADE;
TRUNCATE TABLE public.vaccinations CASCADE;
TRUNCATE TABLE public.animal_visits CASCADE;
TRUNCATE TABLE public.batches CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.suppliers CASCADE;
TRUNCATE TABLE public.animals CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.user_activity_logs CASCADE;
TRUNCATE TABLE public.system_settings CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify tables are empty
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM public.animals) as animals_count,
  (SELECT COUNT(*) FROM public.products) as products_count,
  (SELECT COUNT(*) FROM public.batches) as batches_count,
  (SELECT COUNT(*) FROM public.treatments) as treatments_count,
  (SELECT COUNT(*) FROM public.vaccinations) as vaccinations_count,
  (SELECT COUNT(*) FROM public.animal_visits) as visits_count,
  (SELECT COUNT(*) FROM public.suppliers) as suppliers_count
FROM pg_tables
WHERE schemaname = 'public'
LIMIT 1;
