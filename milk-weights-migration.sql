/*
  # Create Milk Weights Tracking System

  1. New Tables
    - `milk_weights`
      - `id` (uuid, primary key)
      - `date` (date) - The date of the milking session
      - `session_type` (text) - 'rytinis' (morning 6am-3pm) or 'naktinis' (evening 3pm-6am)
      - `weight` (integer) - Weight in kg from the latest measurement
      - `session_id` (text) - Session ID from the webhook
      - `measurement_timestamp` (timestamptz) - Timestamp of the measurement
      - `timezone` (text) - Timezone from webhook
      - `hose_status` (text) - Hose connection status
      - `stable_status` (boolean) - Stable status from webhook
      - `raw_data` (jsonb) - Full webhook payload for debugging
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (date, session_type) - Only one row per day per session

  2. Security
    - Enable RLS on `milk_weights` table
    - Add policies for authenticated users to read/write their data

  3. Functions
    - Function to determine session type based on timestamp
    - Function to upsert milk weight data from webhook
*/

-- Create milk weights table
CREATE TABLE IF NOT EXISTS milk_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('rytinis', 'naktinis')),
  weight integer NOT NULL,
  session_id text,
  measurement_timestamp timestamptz NOT NULL,
  timezone text,
  hose_status text,
  stable_status boolean,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, session_type)
);

-- Enable RLS
ALTER TABLE milk_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all milk weights"
  ON milk_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert milk weights"
  ON milk_weights FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update milk weights"
  ON milk_weights FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete milk weights"
  ON milk_weights FOR DELETE
  TO authenticated
  USING (true);

-- Function to determine session type based on time
CREATE OR REPLACE FUNCTION determine_session_type(measurement_time timestamptz, tz text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  local_hour integer;
BEGIN
  -- Convert to local time and extract hour
  local_hour := EXTRACT(HOUR FROM (measurement_time AT TIME ZONE tz));

  -- Morning session (rytinis): 6am-3pm (6-14)
  IF local_hour >= 6 AND local_hour < 15 THEN
    RETURN 'rytinis';
  -- Evening session (naktinis): 3pm-6am (15-5)
  ELSE
    RETURN 'naktinis';
  END IF;
END;
$$;

-- Function to upsert milk weight from webhook data
CREATE OR REPLACE FUNCTION upsert_milk_weight(
  p_weight integer,
  p_measurement_timestamp timestamptz,
  p_timezone text,
  p_session_id text,
  p_hose_status text,
  p_stable_status boolean,
  p_raw_data jsonb
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date;
  v_session_type text;
  v_existing_weight integer;
  v_result json;
BEGIN
  -- Extract date from measurement timestamp
  v_date := (p_measurement_timestamp AT TIME ZONE p_timezone)::date;

  -- Determine session type
  v_session_type := determine_session_type(p_measurement_timestamp, p_timezone);

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
    p_weight,
    p_session_id,
    p_measurement_timestamp,
    p_timezone,
    p_hose_status,
    p_stable_status,
    p_raw_data,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milk_weights_date ON milk_weights(date DESC);
CREATE INDEX IF NOT EXISTS idx_milk_weights_session ON milk_weights(date, session_type);

-- Add comment
COMMENT ON TABLE milk_weights IS 'Stores daily milk weight measurements in kg from milking sessions. One row per day per session type (morning/evening).';