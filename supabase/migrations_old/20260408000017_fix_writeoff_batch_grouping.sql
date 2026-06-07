-- Fix write-off act population to properly handle batch stock levels
-- The issue: same batch_number appearing multiple times with different stock levels
-- Solution: Group by batch_id (not batch_number) and show current stock

CREATE OR REPLACE FUNCTION populate_write_off_act(
  p_act_id UUID,
  p_module TEXT,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  items_added INTEGER,
  total_amount NUMERIC
) AS $$
DECLARE
  v_items_added INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_line_number INTEGER := 0;
BEGIN
  -- Clear existing items for this act (if any)
  DELETE FROM public.write_off_act_items WHERE act_id = p_act_id;

  IF p_module = 'technika' THEN
    -- Technika: Get products used from equipment_batches
    INSERT INTO public.write_off_act_items (
      act_id,
      product_id,
      product_name,
      product_code,
      category_name,
      unit_type,
      quantity_used,
      unit_price,
      total_price,
      batch_id,
      batch_number,
      line_number,
      received_qty,
      qty_remaining
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      p.product_code,
      translate_category_to_lithuanian(c.name),
      p.unit_type,
      (b.received_qty - b.qty_left) as quantity_used,
      COALESCE(b.purchase_price, 0),
      (b.received_qty - b.qty_left) * COALESCE(b.purchase_price, 0),
      b.id,
      b.batch_number,
      ROW_NUMBER() OVER (PARTITION BY c.name ORDER BY p.name, b.batch_number),
      b.received_qty,
      b.qty_left
    FROM public.equipment_batches b
    JOIN public.equipment_products p ON p.id = b.product_id
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    WHERE b.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND (b.received_qty - b.qty_left) > 0
      AND p.is_active = true;

    GET DIAGNOSTICS v_items_added = ROW_COUNT;

  ELSIF p_module = 'veterinarija' THEN
    -- Veterinarija: Get products used from usage_items
    -- Group by product_id AND batch_id to avoid duplicates
    -- Sum all usage for each batch during the period
    -- Show CURRENT stock levels (not historical)
    INSERT INTO public.write_off_act_items (
      act_id,
      product_id,
      product_name,
      product_code,
      category_name,
      unit_type,
      quantity_used,
      unit_price,
      total_price,
      batch_id,
      batch_number,
      line_number,
      received_qty,
      qty_remaining
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      NULL,
      translate_category_to_lithuanian(p.category::TEXT),
      p.primary_pack_unit::TEXT,
      SUM(ui.qty) as quantity_used,
      COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0) as unit_price,
      SUM(ui.qty) * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0) as total_price,
      b.id,
      COALESCE(b.batch_number, b.lot),
      ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.name, b.batch_number),
      b.received_qty,
      b.qty_left -- Current remaining quantity
    FROM public.usage_items ui
    JOIN public.batches b ON b.id = ui.batch_id
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND ui.qty > 0
    GROUP BY 
      p.id, 
      p.name, 
      p.category, 
      p.primary_pack_unit, 
      b.id, 
      b.batch_number, 
      b.lot, 
      b.received_qty, 
      b.qty_left, 
      b.purchase_price
    HAVING SUM(ui.qty) > 0
    ORDER BY p.category, p.name, b.batch_number;

    GET DIAGNOSTICS v_items_added = ROW_COUNT;
  END IF;

  -- Calculate total amount
  SELECT COALESCE(SUM(total_price), 0) INTO v_total_amount
  FROM public.write_off_act_items
  WHERE act_id = p_act_id;

  -- Update the act's total amount
  UPDATE public.write_off_acts
  SET total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = p_act_id;

  RETURN QUERY SELECT v_items_added, v_total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION populate_write_off_act(UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION populate_write_off_act(UUID, TEXT, DATE, DATE) TO anon;

COMMENT ON FUNCTION populate_write_off_act IS 'Auto-populates write-off act with products used during period. Groups by batch_id to avoid duplicates. Shows current stock levels.';
