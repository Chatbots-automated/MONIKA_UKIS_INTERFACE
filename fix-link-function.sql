-- Fix the linking function to use proper PostgreSQL UPDATE syntax

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
  -- Match criteria: test.paemimo_data = weight.date
  --                 AND producer.label = weight.session_type
  --                 AND paemimo_data <= CURRENT_DATE
  UPDATE milk_composition_tests
  SET milk_weight_id = subq.weight_id
  FROM (
    SELECT
      mct.id as test_id,
      mw.id as weight_id
    FROM milk_composition_tests mct
    INNER JOIN milk_producers mp ON mp.id = mct.producer_id
    INNER JOIN milk_weights mw ON mw.date = mct.paemimo_data AND mw.session_type = mp.label
    WHERE mct.milk_weight_id IS NULL
      AND mct.paemimo_data <= CURRENT_DATE
  ) subq
  WHERE milk_composition_tests.id = subq.test_id;

  GET DIAGNOSTICS v_composition_count = ROW_COUNT;

  -- Link quality tests to milk weights
  -- Same matching criteria as composition tests
  UPDATE milk_quality_tests
  SET milk_weight_id = subq.weight_id
  FROM (
    SELECT
      mqt.id as test_id,
      mw.id as weight_id
    FROM milk_quality_tests mqt
    INNER JOIN milk_producers mp ON mp.id = mqt.producer_id
    INNER JOIN milk_weights mw ON mw.date = mqt.paemimo_data AND mw.session_type = mp.label
    WHERE mqt.milk_weight_id IS NULL
      AND mqt.paemimo_data <= CURRENT_DATE
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
