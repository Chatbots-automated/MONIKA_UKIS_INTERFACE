-- ============================================
-- VIC Animals Sync Function
-- Sync animals from VIC data with activation/deactivation logic
-- ============================================

BEGIN;

-- Function to sync animals from VIC
CREATE OR REPLACE FUNCTION public.sync_animals(_rows jsonb, _source text DEFAULT 'vic_pdf'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_total_seen    int := 0;
  v_pre_existing  int := 0;
  v_inserted      int := 0;
  v_reactivated   int := 0;
  v_deactivated   int := 0;
  v_total_active  int := 0;
  v_updated       int := 0;
BEGIN
  -- Temp payload for this run
  CREATE TEMPORARY TABLE tmp_animals_src (
    tag_no         text PRIMARY KEY,
    vic_client_id  uuid,
    species        text,
    sex            text,
    breed          text,
    birth_date     text,  -- kept as text per schema
    age_months     int,
    holder_name    text,
    holder_address text
  ) ON COMMIT DROP;

  INSERT INTO tmp_animals_src(tag_no, vic_client_id, species, sex, breed, birth_date, age_months, holder_name, holder_address)
  SELECT
    trim(x->>'tag_no'),
    -- Use farm_id if provided, otherwise try vic_client_id
    COALESCE(
      nullif(x->>'farm_id','')::uuid,
      nullif(x->>'vic_client_id','')::uuid
    ),
    nullif(x->>'species',''),
    nullif(x->>'sex',''),
    nullif(x->>'breed',''),
    nullif(x->>'birth_date',''),
    nullif(x->>'age_months','')::int,
    nullif(x->>'holder_name',''),
    nullif(x->>'holder_address','')
  FROM jsonb_array_elements(_rows) AS x
  WHERE (x->>'tag_no') IS NOT NULL AND btrim(x->>'tag_no') <> '';

  GET DIAGNOSTICS v_total_seen = row_count;

  -- How many already exist BEFORE upsert
  SELECT count(*) INTO v_pre_existing
  FROM public.animals a
  JOIN tmp_animals_src s ON s.tag_no = a.tag_no;

  -- How many will be reactivated (were inactive before, now present)
  SELECT count(*) INTO v_reactivated
  FROM public.animals a
  JOIN tmp_animals_src s ON s.tag_no = a.tag_no
  WHERE coalesce(a.active, false) = false;

  -- UPSERT (patch semantics; do not overwrite with NULLs)
  INSERT INTO public.animals AS a
    (tag_no, vic_client_id, species, sex, age_months, holder_name, holder_address, breed, birth_date, active, source, updated_from_vic_at)
  SELECT
    s.tag_no, 
    s.vic_client_id,
    s.species, s.sex, s.age_months, s.holder_name, s.holder_address, s.breed, s.birth_date, true, _source, now()
  FROM tmp_animals_src s
  ON CONFLICT (tag_no) DO UPDATE
    SET vic_client_id        = coalesce(EXCLUDED.vic_client_id, a.vic_client_id),
        species              = coalesce(EXCLUDED.species, a.species),
        sex                  = coalesce(EXCLUDED.sex, a.sex),
        age_months           = coalesce(EXCLUDED.age_months, a.age_months),
        holder_name          = coalesce(EXCLUDED.holder_name, a.holder_name),
        holder_address       = coalesce(EXCLUDED.holder_address, a.holder_address),
        breed                = coalesce(EXCLUDED.breed, a.breed),
        birth_date           = coalesce(EXCLUDED.birth_date, a.birth_date),
        active               = true,
        source               = _source,
        updated_from_vic_at  = now();

  -- inserted = seen - pre_existing
  v_inserted := greatest(v_total_seen - v_pre_existing, 0);
  -- updated = existing - reactivated
  v_updated  := greatest(v_pre_existing - v_reactivated, 0);

  -- Deactivate animals from THIS source that were NOT seen this run
  UPDATE public.animals a
     SET active = false
   WHERE a.source = _source
     AND a.active = true
     AND NOT EXISTS (SELECT 1 FROM tmp_animals_src s WHERE s.tag_no = a.tag_no);

  GET DIAGNOSTICS v_deactivated = row_count;

  SELECT count(*) INTO v_total_active
  FROM public.animals
  WHERE source = _source AND active = true;

  RETURN jsonb_build_object(
    'inserted',      v_inserted,
    'updated',       v_updated,
    'reactivated',   v_reactivated,
    'deactivated',   v_deactivated,
    'total_active',  v_total_active,
    'total_seen',    v_total_seen
  );
END;
$$;

COMMENT ON FUNCTION public.sync_animals IS 
'Sync animals from VIC data with activation/deactivation logic.
Accepts array of animal objects and optional source identifier.
Uses patch semantics (does not overwrite existing values with NULLs).
Deactivates animals from the same source that are not in the current sync.
Returns detailed sync statistics.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_animals(jsonb, text) TO authenticated, service_role, anon;

COMMIT;
