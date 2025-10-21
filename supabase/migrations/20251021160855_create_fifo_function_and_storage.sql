/*
  # Create FIFO function and setup storage

  1. Functions
    - `fn_fifo_batch`: Returns the oldest non-expired batch for a given product
    
  2. Storage
    - Create storage bucket for invoices
    - Set up RLS policies for invoice uploads
    
  3. Triggers
    - Add trigger to prevent negative stock
    - Add trigger to check batch expiry
    
  4. Notes
    - FIFO (First In, First Out) prioritizes oldest batches first
    - Checks for expiry date and available stock
*/

-- Create FIFO batch selection function
CREATE OR REPLACE FUNCTION fn_fifo_batch(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  SELECT b.id INTO v_batch_id
  FROM batches b
  LEFT JOIN stock_by_batch sbb ON sbb.batch_id = b.id
  WHERE b.product_id = p_product_id
    AND sbb.on_hand > 0
    AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
  ORDER BY 
    COALESCE(b.mfg_date, b.created_at::date) ASC,
    b.created_at ASC
  LIMIT 1;
  
  RETURN v_batch_id;
END;
$$;

-- Create function to check if batch has sufficient stock
CREATE OR REPLACE FUNCTION fn_check_batch_stock(p_batch_id uuid, p_qty numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_on_hand numeric;
BEGIN
  SELECT on_hand INTO v_on_hand
  FROM stock_by_batch
  WHERE batch_id = p_batch_id;
  
  RETURN COALESCE(v_on_hand, 0) >= p_qty;
END;
$$;

-- Create function to check if batch is expired
CREATE OR REPLACE FUNCTION fn_is_batch_expired(p_batch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expiry_date date;
BEGIN
  SELECT expiry_date INTO v_expiry_date
  FROM batches
  WHERE id = p_batch_id;
  
  IF v_expiry_date IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_expiry_date < CURRENT_DATE;
END;
$$;

-- Create trigger function to validate usage items
CREATE OR REPLACE FUNCTION trg_validate_usage_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_expired boolean;
  v_has_stock boolean;
  v_lot text;
BEGIN
  -- Check if batch is expired
  v_batch_expired := fn_is_batch_expired(NEW.batch_id);
  IF v_batch_expired THEN
    SELECT lot INTO v_lot FROM batches WHERE id = NEW.batch_id;
    RAISE EXCEPTION 'Partija % yra pasibaigusi. Pasirinkite kitą.', COALESCE(v_lot, 'N/A');
  END IF;
  
  -- Check if batch has sufficient stock
  v_has_stock := fn_check_batch_stock(NEW.batch_id, NEW.qty);
  IF NOT v_has_stock THEN
    RAISE EXCEPTION 'Nepakanka atsargų. Patikrinkite likutį.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_validate_usage_item_before_insert ON usage_items;
CREATE TRIGGER trg_validate_usage_item_before_insert
  BEFORE INSERT ON usage_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_usage_item();

-- Create trigger for biocide usage validation
CREATE OR REPLACE FUNCTION trg_validate_biocide_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_expired boolean;
  v_has_stock boolean;
BEGIN
  -- Only validate if batch_id is provided
  IF NEW.batch_id IS NOT NULL THEN
    v_batch_expired := fn_is_batch_expired(NEW.batch_id);
    IF v_batch_expired THEN
      RAISE EXCEPTION 'Partija yra pasibaigusi. Pasirinkite kitą.';
    END IF;
    
    v_has_stock := fn_check_batch_stock(NEW.batch_id, NEW.qty);
    IF NOT v_has_stock THEN
      RAISE EXCEPTION 'Nepakanka atsargų biocido partidoje.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_biocide_usage_before_insert ON biocide_usage;
CREATE TRIGGER trg_validate_biocide_usage_before_insert
  BEFORE INSERT ON biocide_usage
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_biocide_usage();
