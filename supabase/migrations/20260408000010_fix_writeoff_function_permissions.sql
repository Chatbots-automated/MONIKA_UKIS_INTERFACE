-- Fix permissions for generate_write_off_act_number function
-- Make it SECURITY DEFINER so it can be called by authenticated users

DROP FUNCTION IF EXISTS generate_write_off_act_number(TEXT);

CREATE OR REPLACE FUNCTION generate_write_off_act_number(p_module TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_act_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Count existing acts for this year and module
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.write_off_acts
  WHERE act_number LIKE 'NA-' || v_year || '-' || p_module || '-%';
  
  -- Generate act number: NA-2026-technika-001
  v_act_number := 'NA-' || v_year || '-' || p_module || '-' || LPAD(v_count::TEXT, 3, '0');
  
  RETURN v_act_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION generate_write_off_act_number(TEXT) TO authenticated;

-- Also make sure service_role can execute it
GRANT EXECUTE ON FUNCTION generate_write_off_act_number(TEXT) TO service_role;

-- Ensure the tables have proper grants
GRANT ALL ON public.write_off_acts TO authenticated;
GRANT ALL ON public.write_off_act_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
