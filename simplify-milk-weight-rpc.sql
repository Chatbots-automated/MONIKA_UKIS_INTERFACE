/*
  # Simplify Milk Weight RPC Function

  1. Updates
    - Update `upsert_milk_weight` function to accept nested JSON payload
    - Accepts full webhook payload with nested structure
    - Extracts: measurement.weight, status.hose, status.stable, measurement.ts_local, measurement.tz
    - Parses ts_local as local timestamp in the given timezone
    - Keeps same logic for session type determination and upserting
*/

-- Updated function with nested JSON payload
CREATE OR REPLACE FUNCTION upsert_milk_weight(p_payload jsonb)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date;
  v_session_type text;
  v_existing_weight integer;
  v_measurement_timestamp timestamptz;
  v_weight integer;
  v_hose text;
  v_stable boolean;
  v_ts_local text;
  v_tz text;
  v_session_id text;
  v_result json;
BEGIN
  -- Extract values from nested JSON payload
  v_weight := (p_payload->'measurement'->>'weight')::integer;
  v_hose := p_payload->'status'->>'hose';
  v_stable := (p_payload->'status'->>'stable')::boolean;
  v_ts_local := p_payload->'measurement'->>'ts_local';
  v_tz := p_payload->'measurement'->>'tz';
  v_session_id := p_payload->>'session_id';

  -- Parse the local timestamp and convert to UTC
  -- ts_local is in format "YYYY-MM-DD HH:MI:SS" in the local timezone
  v_measurement_timestamp := (v_ts_local || ' ' || v_tz)::timestamptz;

  -- Extract date from measurement timestamp in local timezone
  v_date := (v_measurement_timestamp AT TIME ZONE v_tz)::date;

  -- Determine session type
  v_session_type := determine_session_type(v_measurement_timestamp, v_tz);

  -- Check if there's an existing record
  SELECT weight INTO v_existing_weight
  FROM milk_weights
  WHERE date = v_date AND session_type = v_session_type;

  -- Upsert the record (always update with latest measurement)
  INSERT INTO milk_weights (
    date,
    session_type,
    weight,
    session_id,
    measurement_timestamp,
    timezone,
    hose_status,
    stable_status,
    raw_data,
    updated_at
  ) VALUES (
    v_date,
    v_session_type,
    v_weight,
    v_session_id,
    v_measurement_timestamp,
    v_tz,
    v_hose,
    v_stable,
    p_payload,
    now()
  )
  ON CONFLICT (date, session_type)
  DO UPDATE SET
    weight = EXCLUDED.weight,
    session_id = EXCLUDED.session_id,
    measurement_timestamp = EXCLUDED.measurement_timestamp,
    timezone = EXCLUDED.timezone,
    hose_status = EXCLUDED.hose_status,
    stable_status = EXCLUDED.stable_status,
    raw_data = EXCLUDED.raw_data,
    updated_at = now()
  RETURNING json_build_object(
    'id', id,
    'date', date,
    'session_type', session_type,
    'weight', weight,
    'previous_weight', v_existing_weight,
    'updated', v_existing_weight IS NOT NULL
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION upsert_milk_weight(jsonb) IS 'Upserts milk weight from webhook payload. Accepts nested JSON with measurement.weight, status.hose, status.stable, measurement.ts_local, measurement.tz.';
