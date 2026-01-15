-- Fix the linking function to handle multiple weight events per date/session
-- Pick the weight event with the maximum weight for each date/session combination

CREATE OR REPLACE FUNCTION link_past_milk_tests_to_weights()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_composition_count integer := 0;
  v_quality_count integer := 0;
  v_result json;
BEGIN
  -- Link composition tests to milk weights
  -- Pick the MAX weight event for each date/session combination
  UPDATE milk_composition_tests
  SET milk_weight_id = subq.weight_id
  FROM (
    SELECT DISTINCT ON (mct.id)
      mct.id as test_id,
      mw.id as weight_id
    FROM milk_composition_tests mct
    INNER JOIN milk_producers mp ON mp.id = mct.producer_id
    INNER JOIN milk_weights mw ON mw.date = mct.paemimo_data AND mw.session_type = mp.label
    WHERE mct.milk_weight_id IS NULL
      AND mct.paemimo_data <= CURRENT_DATE
    ORDER BY mct.id, mw.weight DESC  -- Pick the max weight for this test
  ) subq
  WHERE milk_composition_tests.id = subq.test_id;

  GET DIAGNOSTICS v_composition_count = ROW_COUNT;

  -- Link quality tests to milk weights
  -- Pick the MAX weight event for each date/session combination
  UPDATE milk_quality_tests
  SET milk_weight_id = subq.weight_id
  FROM (
    SELECT DISTINCT ON (mqt.id)
      mqt.id as test_id,
      mw.id as weight_id
    FROM milk_quality_tests mqt
    INNER JOIN milk_producers mp ON mp.id = mqt.producer_id
    INNER JOIN milk_weights mw ON mw.date = mqt.paemimo_data AND mw.session_type = mp.label
    WHERE mqt.milk_weight_id IS NULL
      AND mqt.paemimo_data <= CURRENT_DATE
    ORDER BY mqt.id, mw.weight DESC  -- Pick the max weight for this test
  ) subq
  WHERE milk_quality_tests.id = subq.test_id;

  GET DIAGNOSTICS v_quality_count = ROW_COUNT;

  -- Return results
  v_result := json_build_object(
    'success', true,
    'composition_tests_linked', v_composition_count,
    'quality_tests_linked', v_quality_count,
    'total_linked', v_composition_count + v_quality_count
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Also fix the trigger function
CREATE OR REPLACE FUNCTION auto_link_milk_test_to_weight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_weight_id uuid;
  v_producer_label text;
BEGIN
  -- Only process if milk_weight_id is not already set
  -- and the test date is in the past
  IF NEW.milk_weight_id IS NULL AND NEW.paemimo_data <= CURRENT_DATE THEN

    -- Get the producer label
    SELECT label INTO v_producer_label
    FROM milk_producers
    WHERE id = NEW.producer_id;

    -- Find matching milk weight record with MAX weight
    -- Match on: date = paemimo_data AND session_type = producer.label
    SELECT id INTO v_weight_id
    FROM milk_weights
    WHERE date = NEW.paemimo_data
      AND session_type = v_producer_label
    ORDER BY weight DESC  -- Pick the max weight event
    LIMIT 1;

    -- If found, link it
    IF v_weight_id IS NOT NULL THEN
      NEW.milk_weight_id := v_weight_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
