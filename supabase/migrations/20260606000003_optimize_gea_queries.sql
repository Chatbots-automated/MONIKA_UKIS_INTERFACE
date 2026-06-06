-- Optimize GEA queries for 300k+ rows by only keeping recent data
-- Strategy: Only query the latest import, archive/partition old imports

BEGIN;

-- 1. Create a manual refresh function (useful for debugging)
CREATE OR REPLACE FUNCTION public.refresh_gea_materialized_view()
RETURNS TABLE(
  total_animals bigint,
  animals_with_gea bigint,
  refresh_duration_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  v_total bigint;
  v_with_gea bigint;
BEGIN
  start_time := clock_timestamp();
  
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_animal_latest_gea;
  
  end_time := clock_timestamp();
  
  -- Get stats
  SELECT COUNT(*) INTO v_total FROM animals WHERE active = true;
  SELECT COUNT(*) INTO v_with_gea FROM mv_animal_latest_gea WHERE collar_no IS NOT NULL;
  
  RETURN QUERY SELECT 
    v_total,
    v_with_gea,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_gea_materialized_view() TO authenticated;

COMMENT ON FUNCTION public.refresh_gea_materialized_view IS 
'Manually refresh the GEA materialized view and return stats. Call after bulk data changes.';

-- 2. Create function to clean up old GEA imports (keep only last N imports)
CREATE OR REPLACE FUNCTION public.cleanup_old_gea_imports(keep_count int DEFAULT 10)
RETURNS TABLE(
  deleted_imports int,
  deleted_rows int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_imports int := 0;
  v_deleted_rows int := 0;
  v_cutoff_id uuid;
BEGIN
  -- Find the cutoff import ID (keep only the latest N imports)
  SELECT id INTO v_cutoff_id
  FROM gea_daily_imports
  ORDER BY created_at DESC
  OFFSET keep_count
  LIMIT 1;
  
  IF v_cutoff_id IS NOT NULL THEN
    -- Count what will be deleted
    SELECT COUNT(*) INTO v_deleted_imports
    FROM gea_daily_imports
    WHERE created_at < (SELECT created_at FROM gea_daily_imports WHERE id = v_cutoff_id);
    
    SELECT 
      (SELECT COUNT(*) FROM gea_daily_ataskaita1 WHERE import_id IN (
        SELECT id FROM gea_daily_imports WHERE created_at < (SELECT created_at FROM gea_daily_imports WHERE id = v_cutoff_id)
      )) +
      (SELECT COUNT(*) FROM gea_daily_ataskaita2 WHERE import_id IN (
        SELECT id FROM gea_daily_imports WHERE created_at < (SELECT created_at FROM gea_daily_imports WHERE id = v_cutoff_id)
      )) +
      (SELECT COUNT(*) FROM gea_daily_ataskaita3 WHERE import_id IN (
        SELECT id FROM gea_daily_imports WHERE created_at < (SELECT created_at FROM gea_daily_imports WHERE id = v_cutoff_id)
      ))
    INTO v_deleted_rows;
    
    -- Delete old imports (CASCADE will delete related ataskaita rows)
    DELETE FROM gea_daily_imports
    WHERE created_at < (SELECT created_at FROM gea_daily_imports WHERE id = v_cutoff_id);
  END IF;
  
  RETURN QUERY SELECT v_deleted_imports, v_deleted_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_gea_imports(int) TO authenticated;

COMMENT ON FUNCTION public.cleanup_old_gea_imports IS 
'Delete old GEA imports to keep database size manageable. Default keeps last 10 imports.
Example: SELECT * FROM cleanup_old_gea_imports(5); -- keeps only last 5 imports';

-- 3. Add index on import_id + cow_number for faster joins (if not exists)
CREATE INDEX IF NOT EXISTS idx_gea_a1_import_cow 
  ON public.gea_daily_ataskaita1(import_id, cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a2_import_cow 
  ON public.gea_daily_ataskaita2(import_id, cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a3_import_cow 
  ON public.gea_daily_ataskaita3(import_id, cow_number);

-- 4. Create a view that shows import statistics
CREATE OR REPLACE VIEW public.vw_gea_import_stats AS
SELECT 
  i.id,
  i.created_at,
  i.count_ataskaita1,
  i.count_ataskaita2,
  i.count_ataskaita3,
  -- Calculate actual row counts
  (SELECT COUNT(*) FROM gea_daily_ataskaita1 WHERE import_id = i.id) as actual_a1_rows,
  (SELECT COUNT(*) FROM gea_daily_ataskaita2 WHERE import_id = i.id) as actual_a2_rows,
  (SELECT COUNT(*) FROM gea_daily_ataskaita3 WHERE import_id = i.id) as actual_a3_rows,
  -- Show if this is the latest
  CASE 
    WHEN i.created_at = (SELECT MAX(created_at) FROM gea_daily_imports) THEN true
    ELSE false
  END as is_latest
FROM gea_daily_imports i
ORDER BY i.created_at DESC;

GRANT SELECT ON public.vw_gea_import_stats TO authenticated;

COMMENT ON VIEW public.vw_gea_import_stats IS 
'Statistics for each GEA import. Use to monitor imports and identify the latest one.';

COMMIT;
