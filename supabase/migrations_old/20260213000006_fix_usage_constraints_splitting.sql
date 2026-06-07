/*
  # Fix usage constraints to respect batch splitting

  1. Changes
    - Updates fn_check_usage_constraints() to skip stock check during auto-split operations
    - Prevents interference with auto_split_usage_items() trigger
    - Maintains expiry date validation

  2. Why
    - fn_check_usage_constraints() was checking stock before auto-split completed
    - This caused errors when a single batch was insufficient
    - The auto_split_usage_items() sets app.is_splitting_usage_items flag
    - We need to respect this flag and skip stock validation during splits
*/

CREATE OR REPLACE FUNCTION public.fn_check_usage_constraints()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_exp date;
  v_left numeric;
  v_is_splitting boolean;
BEGIN
  -- Check if we're in a split operation
  BEGIN
    v_is_splitting := current_setting('app.is_splitting_usage_items')::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      v_is_splitting := false;
  END;

  -- Check expiry date (always enforce)
  SELECT expiry_date INTO v_exp FROM public.batches WHERE id = NEW.batch_id;

  IF v_exp IS NOT NULL AND v_exp < current_date THEN
    RAISE EXCEPTION 'Cannot use expired batch (expiry: %).', v_exp;
  END IF;

  -- Skip stock check if we're splitting (auto_split_usage_items handles validation)
  IF v_is_splitting THEN
    RETURN NEW;
  END IF;

  -- Check stock availability
  SELECT on_hand INTO v_left FROM public.stock_by_batch WHERE batch_id = NEW.batch_id;
  IF v_left IS NULL THEN v_left := 0; END IF;

  IF NEW.qty > v_left THEN
    RAISE EXCEPTION 'Not enough stock in batch. Left: %, Tried: %', v_left, NEW.qty;
  END IF;

  RETURN NEW;
END;
$$;
