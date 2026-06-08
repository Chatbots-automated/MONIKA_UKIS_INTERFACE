-- ============================================
-- GEA DAILY IMPORT SYSTEM
-- Complete system for importing GEA farm data
-- ============================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- HELPER FUNCTIONS FOR SAFE DATA CONVERSION
-- Note: These already exist in the baseline, no need to recreate
-- ============================================

-- ============================================
-- MAIN TABLES
-- ============================================

-- Import batch tracking table
CREATE TABLE IF NOT EXISTS public.gea_daily_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  source_filename text NULL,
  source_sha256 text NULL,
  source_size_bytes bigint NULL,

  marker_i1 int NULL,
  marker_i2 int NULL,
  marker_i3 int NULL,

  count_ataskaita1 int NOT NULL DEFAULT 0,
  count_ataskaita2 int NOT NULL DEFAULT 0,
  count_ataskaita3 int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gea_daily_imports_created_at
  ON public.gea_daily_imports(created_at DESC);

COMMENT ON TABLE public.gea_daily_imports IS 'Tracks each GEA data file import batch';

-- Ataskaita 1: Reproduction and status data
CREATE TABLE IF NOT EXISTS public.gea_daily_ataskaita1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.gea_daily_imports(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  cow_number text NOT NULL,
  ear_number text NULL,
  cow_state text NULL,
  group_number text NULL,

  pregnant_since date NULL,
  lactation_days int NULL,
  inseminated_at date NULL,
  pregnant_days int NULL,
  next_pregnancy_date date NULL,
  days_until_waiting_pregnancy int NULL,

  raw jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_gea_a1_import_id 
  ON public.gea_daily_ataskaita1(import_id);

CREATE INDEX IF NOT EXISTS idx_gea_a1_cow_number 
  ON public.gea_daily_ataskaita1(cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a1_ear_number 
  ON public.gea_daily_ataskaita1(ear_number);

CREATE INDEX IF NOT EXISTS idx_gea_a1_import_ear 
  ON public.gea_daily_ataskaita1(import_id, ear_number);

CREATE INDEX IF NOT EXISTS idx_gea_a1_import_cow 
  ON public.gea_daily_ataskaita1(import_id, cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a1_group 
  ON public.gea_daily_ataskaita1(group_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gea_a1_import_cow 
  ON public.gea_daily_ataskaita1(import_id, cow_number);

COMMENT ON TABLE public.gea_daily_ataskaita1 IS 'Report 1: Cow reproduction and status data from GEA';

-- Ataskaita 2: Milk production data
CREATE TABLE IF NOT EXISTS public.gea_daily_ataskaita2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.gea_daily_imports(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  cow_number text NOT NULL,
  genetic_worth text NULL,
  blood_line text NULL,
  avg_milk_prod_weight numeric NULL,
  produce_milk boolean NULL,

  last_milking_date date NULL,
  last_milking_time text NULL,
  last_milking_weight numeric NULL,

  milkings jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_gea_a2_import_id 
  ON public.gea_daily_ataskaita2(import_id);

CREATE INDEX IF NOT EXISTS idx_gea_a2_cow_number 
  ON public.gea_daily_ataskaita2(cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a2_import_cow 
  ON public.gea_daily_ataskaita2(import_id, cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a2_milkings_gin 
  ON public.gea_daily_ataskaita2 USING gin(milkings);

CREATE INDEX IF NOT EXISTS idx_gea_a2_milk 
  ON public.gea_daily_ataskaita2(avg_milk_prod_weight)
  WHERE avg_milk_prod_weight IS NOT NULL AND avg_milk_prod_weight > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gea_a2_import_cow 
  ON public.gea_daily_ataskaita2(import_id, cow_number);

COMMENT ON TABLE public.gea_daily_ataskaita2 IS 'Report 2: Cow milk production data from GEA';

-- Ataskaita 3: Insemination and lactation data
CREATE TABLE IF NOT EXISTS public.gea_daily_ataskaita3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.gea_daily_imports(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  cow_number text NOT NULL,

  teat_missing_right_back boolean NULL,
  teat_missing_back_left boolean NULL,
  teat_missing_front_left boolean NULL,
  teat_missing_front_right boolean NULL,

  insemination_count int NULL,
  bull_1 text NULL,
  bull_2 text NULL,
  bull_3 text NULL,
  lactation_number int NULL,

  raw jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_gea_a3_import_id 
  ON public.gea_daily_ataskaita3(import_id);

CREATE INDEX IF NOT EXISTS idx_gea_a3_cow_number 
  ON public.gea_daily_ataskaita3(cow_number);

CREATE INDEX IF NOT EXISTS idx_gea_a3_import_cow 
  ON public.gea_daily_ataskaita3(import_id, cow_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gea_a3_import_cow 
  ON public.gea_daily_ataskaita3(import_id, cow_number);

COMMENT ON TABLE public.gea_daily_ataskaita3 IS 'Report 3: Cow insemination and lactation data from GEA';

-- ============================================
-- VIEWS
-- ============================================

-- Joined view of all three reports for a given import
CREATE OR REPLACE VIEW public.gea_daily_cows_joined AS
SELECT
  i.id as import_id,
  i.created_at as import_created_at,
  COALESCE(a1.cow_number, a2.cow_number, a3.cow_number) as cow_number,

  a1.ear_number,
  a1.cow_state,
  a1.group_number,
  a1.pregnant_since,
  a1.lactation_days,
  a1.inseminated_at,
  a1.pregnant_days,
  a1.next_pregnancy_date,
  a1.days_until_waiting_pregnancy,

  a2.genetic_worth,
  a2.blood_line,
  a2.avg_milk_prod_weight,
  a2.produce_milk,
  a2.last_milking_date,
  a2.last_milking_time,
  a2.last_milking_weight,
  a2.milkings,

  a3.teat_missing_right_back,
  a3.teat_missing_back_left,
  a3.teat_missing_front_left,
  a3.teat_missing_front_right,
  a3.insemination_count,
  a3.bull_1,
  a3.bull_2,
  a3.bull_3,
  a3.lactation_number

FROM public.gea_daily_imports i
LEFT JOIN public.gea_daily_ataskaita1 a1 ON a1.import_id = i.id
LEFT JOIN public.gea_daily_ataskaita2 a2 ON a2.import_id = i.id AND a2.cow_number = a1.cow_number
LEFT JOIN public.gea_daily_ataskaita3 a3 ON a3.import_id = i.id AND a3.cow_number = COALESCE(a1.cow_number, a2.cow_number);

COMMENT ON VIEW public.gea_daily_cows_joined IS 'Complete GEA data for all cows in each import, joining all three reports';

-- Latest collar number mapping (collar -> animal)
CREATE OR REPLACE VIEW public.vw_animal_latest_collar AS
WITH latest_import AS (
  SELECT id, created_at
  FROM public.gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  a.id as animal_id,
  g.cow_number::integer as collar_no
FROM public.animals a
INNER JOIN latest_import li ON true
INNER JOIN public.gea_daily_ataskaita1 g 
  ON g.import_id = li.id 
  AND g.ear_number = a.tag_no
WHERE g.cow_number IS NOT NULL
  AND g.cow_number ~ '^[0-9]+$';

COMMENT ON VIEW public.vw_animal_latest_collar IS 
'Shows collar numbers ONLY from the absolute latest GEA import. 
If a collar is reassigned, only the current assignment is shown.';

-- Complete latest GEA data for all animals
CREATE OR REPLACE VIEW public.vw_animal_latest_gea_data AS
WITH latest_import AS (
  SELECT id, created_at
  FROM public.gea_daily_imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  a.id as animal_id,
  a.tag_no as animal_ear_tag,
  li.created_at as gea_import_date,
  
  -- From ataskaita1
  g1.cow_number as collar_no,
  g1.cow_state,
  g1.group_number,
  g1.pregnant_since,
  g1.lactation_days,
  g1.inseminated_at,
  g1.pregnant_days,
  g1.next_pregnancy_date,
  g1.days_until_waiting_pregnancy,
  
  -- From ataskaita2
  g2.genetic_worth,
  g2.blood_line,
  g2.avg_milk_prod_weight,
  g2.produce_milk,
  g2.last_milking_date,
  g2.last_milking_time,
  g2.last_milking_weight,
  g2.milkings,
  
  -- From ataskaita3
  g3.teat_missing_right_back,
  g3.teat_missing_back_left,
  g3.teat_missing_front_left,
  g3.teat_missing_front_right,
  g3.insemination_count,
  g3.bull_1,
  g3.bull_2,
  g3.bull_3,
  g3.lactation_number

FROM public.animals a
CROSS JOIN latest_import li
LEFT JOIN public.gea_daily_ataskaita1 g1 
  ON g1.import_id = li.id AND g1.ear_number = a.tag_no
LEFT JOIN public.gea_daily_ataskaita2 g2 
  ON g2.import_id = li.id AND g2.cow_number = g1.cow_number
LEFT JOIN public.gea_daily_ataskaita3 g3 
  ON g3.import_id = li.id AND g3.cow_number = g1.cow_number;

COMMENT ON VIEW public.vw_animal_latest_gea_data IS 
'Complete GEA data for all animals from the absolute latest import.
Shows collar numbers, pregnancy data, milking data, etc.';

-- ============================================
-- UPLOAD FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.gea_daily_upload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import_id uuid;

  v_meta jsonb := COALESCE(payload->'meta', '{}'::jsonb);
  v_counts jsonb := COALESCE(v_meta->'counts', '{}'::jsonb);
  v_markers jsonb := COALESCE(v_meta->'markers', '{}'::jsonb);

  v_at1 jsonb := COALESCE(payload->'ataskaita1', '[]'::jsonb);
  v_at2 jsonb := COALESCE(payload->'ataskaita2', '[]'::jsonb);
  v_at3 jsonb := COALESCE(payload->'ataskaita3', '[]'::jsonb);

  v_count1 int := COALESCE(NULLIF(v_counts->>'ataskaita1','')::int, jsonb_array_length(v_at1));
  v_count2 int := COALESCE(NULLIF(v_counts->>'ataskaita2','')::int, jsonb_array_length(v_at2));
  v_count3 int := COALESCE(NULLIF(v_counts->>'ataskaita3','')::int, jsonb_array_length(v_at3));

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
    NULLIF(v_markers->>'i1','')::int,
    NULLIF(v_markers->>'i2','')::int,
    NULLIF(v_markers->>'i3','')::int,
    v_count1, v_count2, v_count3
  )
  RETURNING id INTO v_import_id;

  -- Insert ataskaita1
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
      NULLIF(btrim(x->>'cow_number'), ''),
      NULLIF(btrim(x->>'ear_number'), ''),
      NULLIF(btrim(x->>'cow_state'), ''),
      NULLIF(btrim(x->>'group_number'), ''),
      public.safe_date(x->>'pregnant_since'),
      public.safe_int(x->>'lactation_days'),
      public.safe_date(x->>'inseminated_at'),
      public.safe_int(x->>'pregnant_days'),
      public.safe_date(x->>'next_pregnancy_date'),
      public.safe_int(x->>'days_until_waiting_pregnancy'),
      x
    FROM jsonb_array_elements(v_at1) as x
    WHERE COALESCE(NULLIF(btrim(x->>'cow_number'), ''), '') <> ''
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

  -- Insert ataskaita2
  IF jsonb_typeof(v_at2) = 'array' AND jsonb_array_length(v_at2) > 0 THEN
    WITH src AS (
      SELECT x
      FROM jsonb_array_elements(v_at2) as x
      WHERE COALESCE(NULLIF(btrim(x->>'cow_number'), ''), '') <> ''
    ),
    norm AS (
      SELECT
        x,
        NULLIF(btrim(x->>'cow_number'), '') as cow_number,
        NULLIF(btrim(x->>'genetic_worth'), '') as genetic_worth,
        NULLIF(btrim(x->>'blood_line'), '') as blood_line,

        public.safe_numeric(x->>'avg_milk_prod_weight') as avg_milk_prod_weight,
        public.safe_bool_lt(x->>'produce_milk') as produce_milk,

        public.safe_date(x->>'last_milking_date') as last_milking_date,
        NULLIF(btrim(x->>'last_milking_time'), '') as last_milking_time,
        public.safe_numeric(x->>'last_milking_weight') as last_milking_weight,

        (
          SELECT COALESCE(jsonb_agg(m) FILTER (WHERE m IS NOT NULL), '[]'::jsonb)
          FROM (
            VALUES
              (CASE WHEN COALESCE(x->>'milking_date_1','')<>'' OR COALESCE(x->>'milking_time_1','')<>'' OR COALESCE(x->>'milking_weight_1','')<>'' THEN
                jsonb_build_object('idx',1,'date',public.safe_date(x->>'milking_date_1'),'time',NULLIF(btrim(x->>'milking_time_1'),''),'weight',public.safe_numeric(x->>'milking_weight_1')) END),
              (CASE WHEN COALESCE(x->>'milking_date_2','')<>'' OR COALESCE(x->>'milking_time_2','')<>'' OR COALESCE(x->>'milking_weight_2','')<>'' THEN
                jsonb_build_object('idx',2,'date',public.safe_date(x->>'milking_date_2'),'time',NULLIF(btrim(x->>'milking_time_2'),''),'weight',public.safe_numeric(x->>'milking_weight_2')) END),
              (CASE WHEN COALESCE(x->>'milking_date_3','')<>'' OR COALESCE(x->>'milking_time_3','')<>'' OR COALESCE(x->>'milking_weight_3','')<>'' THEN
                jsonb_build_object('idx',3,'date',public.safe_date(x->>'milking_date_3'),'time',NULLIF(btrim(x->>'milking_time_3'),''),'weight',public.safe_numeric(x->>'milking_weight_3')) END),
              (CASE WHEN COALESCE(x->>'milking_date_4','')<>'' OR COALESCE(x->>'milking_time_4','')<>'' OR COALESCE(x->>'milking_weight_4','')<>'' THEN
                jsonb_build_object('idx',4,'date',public.safe_date(x->>'milking_date_4'),'time',NULLIF(btrim(x->>'milking_time_4'),''),'weight',public.safe_numeric(x->>'milking_weight_4')) END),
              (CASE WHEN COALESCE(x->>'milking_date_5','')<>'' OR COALESCE(x->>'milking_time_5','')<>'' OR COALESCE(x->>'milking_weight_5','')<>'' THEN
                jsonb_build_object('idx',5,'date',public.safe_date(x->>'milking_date_5'),'time',NULLIF(btrim(x->>'milking_time_5'),''),'weight',public.safe_numeric(x->>'milking_weight_5')) END),
              (CASE WHEN COALESCE(x->>'milking_date_6','')<>'' OR COALESCE(x->>'milking_time_6','')<>'' OR COALESCE(x->>'milking_weight_6','')<>'' THEN
                jsonb_build_object('idx',6,'date',public.safe_date(x->>'milking_date_6'),'time',NULLIF(btrim(x->>'milking_time_6'),''),'weight',public.safe_numeric(x->>'milking_weight_6')) END),
              (CASE WHEN COALESCE(x->>'milking_date_7','')<>'' OR COALESCE(x->>'milking_time_7','')<>'' OR COALESCE(x->>'milking_weight_7','')<>'' THEN
                jsonb_build_object('idx',7,'date',public.safe_date(x->>'milking_date_7'),'time',NULLIF(btrim(x->>'milking_time_7'),''),'weight',public.safe_numeric(x->>'milking_weight_7')) END),
              (CASE WHEN COALESCE(x->>'milking_date_8','')<>'' OR COALESCE(x->>'milking_time_8','')<>'' OR COALESCE(x->>'milking_weight_8','')<>'' THEN
                jsonb_build_object('idx',8,'date',public.safe_date(x->>'milking_date_8'),'time',NULLIF(btrim(x->>'milking_time_8'),''),'weight',public.safe_numeric(x->>'milking_weight_8')) END),
              (CASE WHEN COALESCE(x->>'milking_date_9','')<>'' OR COALESCE(x->>'milking_time_9','')<>'' OR COALESCE(x->>'milking_weight_9','')<>'' THEN
                jsonb_build_object('idx',9,'date',public.safe_date(x->>'milking_date_9'),'time',NULLIF(btrim(x->>'milking_time_9'),''),'weight',public.safe_numeric(x->>'milking_weight_9')) END)
          ) as t(m)
        ) as milkings
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

  -- Insert ataskaita3
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
      NULLIF(btrim(x->>'cow_number'), ''),
      public.safe_bool_lt(x->>'teat_missing_right_back'),
      public.safe_bool_lt(x->>'teat_missing_back_left'),
      public.safe_bool_lt(x->>'teat_missing_front_left'),
      public.safe_bool_lt(x->>'teat_missing_front_right'),
      public.safe_int(x->>'insemination_count'),
      NULLIF(btrim(x->>'bull_1'), ''),
      NULLIF(btrim(x->>'bull_2'), ''),
      NULLIF(btrim(x->>'bull_3'), ''),
      public.safe_int(x->>'lactation_number'),
      x
    FROM jsonb_array_elements(v_at3) as x
    WHERE COALESCE(NULLIF(btrim(x->>'cow_number'), ''), '') <> ''
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

  RETURN jsonb_build_object(
    'import_id', v_import_id,
    'counts', jsonb_build_object(
      'ataskaita1', v_count1,
      'ataskaita2', v_count2,
      'ataskaita3', v_count3
    )
  );
END;
$$;

COMMENT ON FUNCTION public.gea_daily_upload IS 
'Upload GEA farm data from n8n. Accepts payload with meta and 3 ataskaita arrays.
Returns the import_id and counts. Safe against invalid numeric values.';

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant permissions on tables
GRANT SELECT ON public.gea_daily_imports TO authenticated, anon;
GRANT SELECT ON public.gea_daily_ataskaita1 TO authenticated, anon;
GRANT SELECT ON public.gea_daily_ataskaita2 TO authenticated, anon;
GRANT SELECT ON public.gea_daily_ataskaita3 TO authenticated, anon;

-- Grant permissions on views
GRANT SELECT ON public.gea_daily_cows_joined TO authenticated, anon;
GRANT SELECT ON public.vw_animal_latest_collar TO authenticated, anon;
GRANT SELECT ON public.vw_animal_latest_gea_data TO authenticated, anon;

-- Grant execute on upload function
REVOKE ALL ON FUNCTION public.gea_daily_upload(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gea_daily_upload(jsonb) TO authenticated, service_role;

COMMIT;
