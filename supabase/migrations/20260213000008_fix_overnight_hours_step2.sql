-- Step 2: Create the calculation function
CREATE OR REPLACE FUNCTION calculate_manual_hours(
  p_start_time TIME,
  p_end_time TIME,
  p_lunch_type TEXT,
  p_worker_type TEXT,
  p_non_driving_hours NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_hours NUMERIC;
BEGIN
  -- For vairuotojas, use non_driving_hours
  IF p_worker_type = 'vairuotojas' THEN
    RETURN COALESCE(p_non_driving_hours, 0);
  END IF;
  
  -- For others, calculate from times
  IF p_start_time IS NULL OR p_end_time IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate hours, handling overnight shifts
  IF p_end_time < p_start_time THEN
    v_hours := EXTRACT(EPOCH FROM (p_end_time + INTERVAL '24 hours' - p_start_time)) / 3600;
  ELSE
    v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  END IF;
  
  -- Apply lunch deduction
  CASE p_lunch_type
    WHEN 'full' THEN v_hours := v_hours - 1;
    WHEN 'half' THEN v_hours := v_hours - 0.5;
    ELSE NULL;
  END CASE;
  
  RETURN GREATEST(0, v_hours);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
