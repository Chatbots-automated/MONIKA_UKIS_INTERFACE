-- Auto-refresh materialized view after GEA imports
-- This ensures the UI always shows the latest data

BEGIN;

-- Update the gea_daily_upload RPC to refresh the materialized view after import
CREATE OR REPLACE FUNCTION public.gea_daily_upload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
DECLARE
  v_import_id uuid;

  v_meta jsonb := coalesce(payload->'meta', '{}'::jsonb);
  v_counts jsonb := coalesce(v_meta->'counts', '{}'::jsonb);
  v_markers jsonb := coalesce(v_meta->'markers', '{}'::jsonb);

  v_at1 jsonb := coalesce(payload->'ataskaita1', '[]'::jsonb);
  v_at2 jsonb := coalesce(payload->'ataskaita2', '[]'::jsonb);
  v_at3 jsonb := coalesce(payload->'ataskaita3', '[]'::jsonb);

  v_count1 int := coalesce(nullif(v_counts->>'ataskaita1','')::int, jsonb_array_length(v_at1));
  v_count2 int := coalesce(nullif(v_counts->>'ataskaita2','')::int, jsonb_array_length(v_at2));
  v_count3 int := coalesce(nullif(v_counts->>'ataskaita3','')::int, jsonb_array_length(v_at3));

  v_user uuid := auth.uid();
BEGIN
  -- Create import batch
  INSERT INTO public.gea_daily_imports (
    created_by,
    marker_i1, marker_i2, marker_i3,
    count_ataskaita1, count_ataskaita2, count_ataskaita3
  )
  VALUES (
    v_user,
    nullif(v_markers->>'i1','')::int,
    nullif(v_markers->>'i2','')::int,
    nullif(v_markers->>'i3','')::int,
    v_count1, v_count2, v_count3
  )
  RETURNING id INTO v_import_id;

  -- ---------------- AT1 ----------------
  IF jsonb_typeof(v_at1) = 'array' AND jsonb_array_length(v_at1) > 0 THEN
    INSERT INTO public.gea_daily_ataskaita1 (
      import_id,
      cow_number, ear_number, cow_state, group_number,
      pregnant_since, lactation_days, inseminated_at, pregnant_days,
      next_pregnancy_date, days_until_waiting_pregnancy,
      raw
    )
    SELECT
      v_import_id,
      nullif(btrim(x->>'cow_number'), ''),
      nullif(btrim(x->>'ear_number'), ''),
      nullif(btrim(x->>'cow_state'), ''),
      nullif(btrim(x->>'group_number'), ''),
      public.safe_date(x->>'pregnant_since'),
      public.safe_int(x->>'lactation_days'),
      public.safe_date(x->>'inseminated_at'),
      public.safe_int(x->>'pregnant_days'),
      public.safe_date(x->>'next_pregnancy_date'),
      public.safe_int(x->>'days_until_waiting_pregnancy'),
      x
    FROM jsonb_array_elements(v_at1) AS x
    WHERE coalesce(nullif(btrim(x->>'cow_number'), ''), '') <> ''
    ON CONFLICT (import_id, cow_number) DO UPDATE
      SET ear_number = EXCLUDED.ear_number,
          cow_state = EXCLUDED.cow_state,
          group_number = EXCLUDED.group_number,
          pregnant_since = EXCLUDED.pregnant_since,
          lactation_days = EXCLUDED.lactation_days,
          inseminated_at = EXCLUDED.inseminated_at,
          pregnant_days = EXCLUDED.pregnant_days,
          next_pregnancy_date = EXCLUDED.next_pregnancy_date,
          days_until_waiting_pregnancy = EXCLUDED.days_until_waiting_pregnancy,
          raw = EXCLUDED.raw;
  END IF;

  -- ---------------- AT2 ----------------
  IF jsonb_typeof(v_at2) = 'array' AND jsonb_array_length(v_at2) > 0 THEN
    WITH src AS (
      SELECT x
      FROM jsonb_array_elements(v_at2) AS x
      WHERE coalesce(nullif(btrim(x->>'cow_number'), ''), '') <> ''
    ),
    norm AS (
      SELECT
        x,
        nullif(btrim(x->>'cow_number'), '') AS cow_number,
        nullif(btrim(x->>'genetic_worth'), '') AS genetic_worth,
        nullif(btrim(x->>'blood_line'), '') AS blood_line,

        public.safe_numeric(x->>'avg_milk_prod_weight') AS avg_milk_prod_weight,
        public.safe_bool_lt(x->>'produce_milk') AS produce_milk,

        public.safe_date(x->>'last_milking_date') AS last_milking_date,
        nullif(btrim(x->>'last_milking_time'), '') AS last_milking_time,
        public.safe_numeric(x->>'last_milking_weight') AS last_milking_weight,

        (
          SELECT coalesce(jsonb_agg(m) FILTER (WHERE m IS NOT NULL), '[]'::jsonb)
          FROM (
            VALUES
              (CASE WHEN coalesce(x->>'milking_date_1','')<>'' OR coalesce(x->>'milking_time_1','')<>'' OR coalesce(x->>'milking_weight_1','')<>'' THEN
                jsonb_build_object('idx',1,'date',public.safe_date(x->>'milking_date_1'),'time',nullif(btrim(x->>'milking_time_1'),''),'weight',public.safe_numeric(x->>'milking_weight_1')) END),
              (CASE WHEN coalesce(x->>'milking_date_2','')<>'' OR coalesce(x->>'milking_time_2','')<>'' OR coalesce(x->>'milking_weight_2','')<>'' THEN
                jsonb_build_object('idx',2,'date',public.safe_date(x->>'milking_date_2'),'time',nullif(btrim(x->>'milking_time_2'),''),'weight',public.safe_numeric(x->>'milking_weight_2')) END),
              (CASE WHEN coalesce(x->>'milking_date_3','')<>'' OR coalesce(x->>'milking_time_3','')<>'' OR coalesce(x->>'milking_weight_3','')<>'' THEN
                jsonb_build_object('idx',3,'date',public.safe_date(x->>'milking_date_3'),'time',nullif(btrim(x->>'milking_time_3'),''),'weight',public.safe_numeric(x->>'milking_weight_3')) END),
              (CASE WHEN coalesce(x->>'milking_date_4','')<>'' OR coalesce(x->>'milking_time_4','')<>'' OR coalesce(x->>'milking_weight_4','')<>'' THEN
                jsonb_build_object('idx',4,'date',public.safe_date(x->>'milking_date_4'),'time',nullif(btrim(x->>'milking_time_4'),''),'weight',public.safe_numeric(x->>'milking_weight_4')) END),
              (CASE WHEN coalesce(x->>'milking_date_5','')<>'' OR coalesce(x->>'milking_time_5','')<>'' OR coalesce(x->>'milking_weight_5','')<>'' THEN
                jsonb_build_object('idx',5,'date',public.safe_date(x->>'milking_date_5'),'time',nullif(btrim(x->>'milking_time_5'),''),'weight',public.safe_numeric(x->>'milking_weight_5')) END),
              (CASE WHEN coalesce(x->>'milking_date_6','')<>'' OR coalesce(x->>'milking_time_6','')<>'' OR coalesce(x->>'milking_weight_6','')<>'' THEN
                jsonb_build_object('idx',6,'date',public.safe_date(x->>'milking_date_6'),'time',nullif(btrim(x->>'milking_time_6'),''),'weight',public.safe_numeric(x->>'milking_weight_6')) END),
              (CASE WHEN coalesce(x->>'milking_date_7','')<>'' OR coalesce(x->>'milking_time_7','')<>'' OR coalesce(x->>'milking_weight_7','')<>'' THEN
                jsonb_build_object('idx',7,'date',public.safe_date(x->>'milking_date_7'),'time',nullif(btrim(x->>'milking_time_7'),''),'weight',public.safe_numeric(x->>'milking_weight_7')) END),
              (CASE WHEN coalesce(x->>'milking_date_8','')<>'' OR coalesce(x->>'milking_time_8','')<>'' OR coalesce(x->>'milking_weight_8','')<>'' THEN
                jsonb_build_object('idx',8,'date',public.safe_date(x->>'milking_date_8'),'time',nullif(btrim(x->>'milking_time_8'),''),'weight',public.safe_numeric(x->>'milking_weight_8')) END),
              (CASE WHEN coalesce(x->>'milking_date_9','')<>'' OR coalesce(x->>'milking_time_9','')<>'' OR coalesce(x->>'milking_weight_9','')<>'' THEN
                jsonb_build_object('idx',9,'date',public.safe_date(x->>'milking_date_9'),'time',nullif(btrim(x->>'milking_time_9'),''),'weight',public.safe_numeric(x->>'milking_weight_9')) END)
          ) AS t(m)
        ) AS milkings
      FROM src
    )
    INSERT INTO public.gea_daily_ataskaita2 (
      import_id,
      cow_number, genetic_worth, blood_line, avg_milk_prod_weight, produce_milk,
      last_milking_date, last_milking_time, last_milking_weight,
      milkings,
      raw
    )
    SELECT
      v_import_id,
      n.cow_number,
      n.genetic_worth,
      n.blood_line,
      n.avg_milk_prod_weight,
      n.produce_milk,
      n.last_milking_date,
      n.last_milking_time,
      n.last_milking_weight,
      n.milkings,
      n.x
    FROM norm n
    ON CONFLICT (import_id, cow_number) DO UPDATE
      SET genetic_worth = EXCLUDED.genetic_worth,
          blood_line = EXCLUDED.blood_line,
          avg_milk_prod_weight = EXCLUDED.avg_milk_prod_weight,
          produce_milk = EXCLUDED.produce_milk,
          last_milking_date = EXCLUDED.last_milking_date,
          last_milking_time = EXCLUDED.last_milking_time,
          last_milking_weight = EXCLUDED.last_milking_weight,
          milkings = EXCLUDED.milkings,
          raw = EXCLUDED.raw;
  END IF;

  -- ---------------- AT3 ----------------
  IF jsonb_typeof(v_at3) = 'array' AND jsonb_array_length(v_at3) > 0 THEN
    INSERT INTO public.gea_daily_ataskaita3 (
      import_id,
      cow_number,
      teat_missing_right_back,
      teat_missing_back_left,
      teat_missing_front_left,
      teat_missing_front_right,
      insemination_count,
      bull_1, bull_2, bull_3,
      lactation_number,
      raw
    )
    SELECT
      v_import_id,
      nullif(btrim(x->>'cow_number'), ''),
      public.safe_bool_lt(x->>'teat_missing_right_back'),
      public.safe_bool_lt(x->>'teat_missing_back_left'),
      public.safe_bool_lt(x->>'teat_missing_front_left'),
      public.safe_bool_lt(x->>'teat_missing_front_right'),
      public.safe_int(x->>'insemination_count'),
      nullif(btrim(x->>'bull_1'), ''),
      nullif(btrim(x->>'bull_2'), ''),
      nullif(btrim(x->>'bull_3'), ''),
      public.safe_int(x->>'lactation_number'),
      x
    FROM jsonb_array_elements(v_at3) AS x
    WHERE coalesce(nullif(btrim(x->>'cow_number'), ''), '') <> ''
    ON CONFLICT (import_id, cow_number) DO UPDATE
      SET teat_missing_right_back = EXCLUDED.teat_missing_right_back,
          teat_missing_back_left = EXCLUDED.teat_missing_back_left,
          teat_missing_front_left = EXCLUDED.teat_missing_front_left,
          teat_missing_front_right = EXCLUDED.teat_missing_front_right,
          insemination_count = EXCLUDED.insemination_count,
          bull_1 = EXCLUDED.bull_1,
          bull_2 = EXCLUDED.bull_2,
          bull_3 = EXCLUDED.bull_3,
          lactation_number = EXCLUDED.lactation_number,
          raw = EXCLUDED.raw;
  END IF;

  -- ✅ NEW: Refresh materialized view so UI shows latest data immediately
  -- This happens in background but completes quickly (usually < 1 second)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_animal_latest_gea;

  RETURN jsonb_build_object(
    'import_id', v_import_id,
    'counts', jsonb_build_object(
      'ataskaita1', v_count1,
      'ataskaita2', v_count2,
      'ataskaita3', v_count3
    ),
    'refreshed_materialized_view', true
  );
END;
$$;

-- Set correct permissions
REVOKE ALL ON FUNCTION public.gea_daily_upload(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.gea_daily_upload(jsonb) TO authenticated;

COMMENT ON FUNCTION public.gea_daily_upload IS 
'Imports GEA daily data and automatically refreshes the materialized view for immediate UI updates.';

COMMIT;
