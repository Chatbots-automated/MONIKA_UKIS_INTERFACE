-- ============================================
-- Update GEA Upload Function
-- Accept the parser output format directly from n8n
-- ============================================

BEGIN;

-- Drop the view we don't need
DROP VIEW IF EXISTS public.gea_daily_cows_joined;

-- Drop the existing function to change parameter name
DROP FUNCTION IF EXISTS public.gea_daily_upload(jsonb);

-- Create the upload function to accept parser output format directly
CREATE FUNCTION public.gea_daily_upload(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import_id uuid;
  
  -- Extract payload wrapper
  v_data jsonb := COALESCE(p_payload->'payload', p_payload);
  
  -- Extract the report arrays from the all_journals structure
  v_report1 jsonb := COALESCE(v_data->'report_1_reproduction_status'->'rows', '[]'::jsonb);
  v_report2 jsonb := COALESCE(v_data->'report_2_milk_production'->'rows', '[]'::jsonb);
  v_report3 jsonb := COALESCE(v_data->'report_3_insemination_lactation'->'rows', '[]'::jsonb);
  
  v_count1 int := COALESCE((v_data->'report_1_reproduction_status'->>'row_count')::int, jsonb_array_length(v_report1));
  v_count2 int := COALESCE((v_data->'report_2_milk_production'->>'row_count')::int, jsonb_array_length(v_report2));
  v_count3 int := COALESCE((v_data->'report_3_insemination_lactation'->>'row_count')::int, jsonb_array_length(v_report3));
  
  v_user uuid := auth.uid();
BEGIN
  -- Create import batch
  INSERT INTO public.gea_daily_imports (
    created_by,
    source_filename,
    count_ataskaita1,
    count_ataskaita2,
    count_ataskaita3
  )
  VALUES (
    v_user,
    'BENDRA_INFO2',
    v_count1,
    v_count2,
    v_count3
  )
  RETURNING id INTO v_import_id;

  -- ============================================
  -- Insert Report 1: Reproduction/Status
  -- ============================================
  IF jsonb_typeof(v_report1) = 'array' AND jsonb_array_length(v_report1) > 0 THEN
    INSERT INTO public.gea_daily_ataskaita1 (
      import_id,
      cow_number,
      ear_number,
      cow_state,
      group_number,
      pregnant_since,
      lactation_days,
      inseminated_at,
      pregnant_days,
      next_pregnancy_date,
      days_until_waiting_pregnancy,
      raw
    )
    SELECT
      v_import_id,
      (x->>'cow_number')::text,
      NULLIF(btrim(x->>'ear_number'), ''),
      NULLIF(btrim(x->>'status'), ''),  -- "status" from parser
      (x->>'group_number')::text,
      public.safe_date(x->>'calving_action_date'),  -- "calving_action_date" → pregnant_since
      public.safe_int(x->>'lactation_days'),
      public.safe_date(x->>'insemination_action_date'),  -- "insemination_action_date" → inseminated_at
      public.safe_int(x->>'pregnancy_days'),
      public.safe_date(x->>'expected_calving_date'),  -- "expected_calving_date" → next_pregnancy_date
      public.safe_int(x->>'days_until_expected_calving'),  -- "days_until_expected_calving" → days_until_waiting_pregnancy
      x
    FROM jsonb_array_elements(v_report1) as x
    WHERE x->>'cow_number' IS NOT NULL
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

  -- ============================================
  -- Insert Report 2: Milk Production
  -- ============================================
  IF jsonb_typeof(v_report2) = 'array' AND jsonb_array_length(v_report2) > 0 THEN
    INSERT INTO public.gea_daily_ataskaita2 (
      import_id,
      cow_number,
      genetic_worth,
      blood_line,
      avg_milk_prod_weight,
      produce_milk,
      last_milking_date,
      last_milking_time,
      last_milking_weight,
      milkings,
      raw
    )
    SELECT
      v_import_id,
      (x->>'cow_number')::text,
      NULLIF(btrim(x->>'breeding_value_by_milk_vpp'), ''),  -- "breeding_value_by_milk_vpp" → genetic_worth
      NULLIF(btrim(x->>'blood_line'), ''),
      public.safe_numeric(x->>'average_daily_milk'),  -- "average_daily_milk" → avg_milk_prod_weight
      COALESCE((x->>'in_milk_production')::boolean, false),  -- Already a boolean from parser
      -- Extract last (most recent) milking data from first element of milk_readings array
      public.safe_date((x->'milk_readings'->0->>'milking_date')),
      NULLIF(btrim(x->'milk_readings'->0->>'milking_time'), ''),
      public.safe_numeric(x->'milk_readings'->0->>'milk_quantity'),
      -- Transform milk_readings field names to match UI expectations
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'idx', (m->>'reading_index')::int,
            'date', m->>'milking_date',
            'time', m->>'milking_time',
            'weight', (m->>'milk_quantity')::numeric
          )
        ), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(x->'milk_readings', '[]'::jsonb)) AS m
      ),
      x
    FROM jsonb_array_elements(v_report2) as x
    WHERE x->>'cow_number' IS NOT NULL
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

  -- ============================================
  -- Insert Report 3: Insemination/Lactation
  -- ============================================
  IF jsonb_typeof(v_report3) = 'array' AND jsonb_array_length(v_report3) > 0 THEN
    INSERT INTO public.gea_daily_ataskaita3 (
      import_id,
      cow_number,
      teat_missing_right_back,
      teat_missing_back_left,
      teat_missing_front_left,
      teat_missing_front_right,
      insemination_count,
      bull_1,
      bull_2,
      bull_3,
      lactation_number,
      raw
    )
    SELECT
      v_import_id,
      (x->>'cow_number')::text,
      COALESCE((x->>'missing_teat_1')::int = 1, false),  -- 0/1 → boolean
      COALESCE((x->>'missing_teat_2')::int = 1, false),
      COALESCE((x->>'missing_teat_3')::int = 1, false),
      COALESCE((x->>'missing_teat_4')::int = 1, false),
      public.safe_int(x->>'insemination_count_current_lactation_3_day_rule'),  -- Long name → insemination_count
      NULLIF(btrim(x->>'insemination_bull_1'), ''),  -- "insemination_bull_1" → bull_1
      NULLIF(btrim(x->>'insemination_bull_2'), ''),
      NULLIF(btrim(x->>'insemination_bull_3'), ''),
      public.safe_int(x->>'lactation_number'),
      x
    FROM jsonb_array_elements(v_report3) as x
    WHERE x->>'cow_number' IS NOT NULL
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

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'import_id', v_import_id,
    'imported_at', now(),
    'counts', jsonb_build_object(
      'report_1_rows', v_count1,
      'report_2_rows', v_count2,
      'report_3_rows', v_count3,
      'total_cows', v_count1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.gea_daily_upload IS 
'Upload GEA farm data from n8n parser.
Accepts: { "payload": { "report_1_...", "report_2_...", "report_3_..." } }
Returns: { "success": true, "import_id": "...", "counts": {...} }';

-- Re-grant permissions after dropping and recreating
REVOKE ALL ON FUNCTION public.gea_daily_upload(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gea_daily_upload(jsonb) TO authenticated, service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
