/*
  # Simplify Milk Weight RPC Function

  1. Updates
    - Update `upsert_milk_weight` function to accept simplified payload
    - Accepts: weight, hose, stable, timestamp_lt, tz
    - Parses timestamp_lt as local timestamp in the given timezone
    - Keeps same logic for session type determination and upserting
*/

-- Updated function with simplified parameters
CREATE OR REPLACE FUNCTION upsert_milk_weight(
  p_weight integer,
  p_hose text,
  p_stable boolean,
  p_timestamp_lt text,
  p_tz text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date;
  v_session_type text;
  v_existing_weight integer;
  v_measurement_timestamp timestamptz;
  v_result json;
BEGIN
  -- Parse the local timestamp and convert to UTC
  -- timestamp_lt is in format "YYYY-MM-DD HH:MI:SS" in the local timezone
  v_measurement_timestamp := (p_timestamp_lt || ' ' || p_tz)::timestamptz;

  -- Extract date from measurement timestamp in local timezone
  v_date := (v_measurement_timestamp AT TIME ZONE p_tz)::date;

  -- Determine session type
  v_session_type := determine_session_type(v_measurement_timestamp, p_tz);

  -- Check if there's an existing record
  SELECT weight INTO v_existing_weight
  FROM milk_weights
  WHERE date = v_date AND session_type = v_session_type;

  -- Upsert the record (always update with latest measurement)
  INSERT INTO milk_weights (
    date,
    session_type,
    weight,
    measurement_timestamp,
    timezone,
    hose_status,
    stable_status,
    updated_at
  ) VALUES (
    v_date,
    v_session_type,
    p_weight,
    v_measurement_timestamp,
    p_tz,
    p_hose,
    p_stable,
    now()
  )
  ON CONFLICT (date, session_type)
  DO UPDATE SET
    weight = EXCLUDED.weight,
    measurement_timestamp = EXCLUDED.measurement_timestamp,
    timezone = EXCLUDED.timezone,
    hose_status = EXCLUDED.hose_status,
    stable_status = EXCLUDED.stable_status,
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
COMMENT ON FUNCTION upsert_milk_weight(integer, text, boolean, text, text) IS 'Upserts milk weight from simplified webhook payload. Accepts weight, hose status, stable flag, local timestamp, and timezone.';
