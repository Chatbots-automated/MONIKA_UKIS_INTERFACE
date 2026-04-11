-- Function to auto-populate write-off act with used products from a date range
-- This queries usage data from both technika and veterinarija modules

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
    -- Calculate usage as (received_qty - qty_left) for batches created in the period
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
      line_number
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      p.product_code,
      c.name,
      p.unit_type,
      (b.received_qty - b.qty_left) as quantity_used,
      COALESCE(b.purchase_price, 0),
      (b.received_qty - b.qty_left) * COALESCE(b.purchase_price, 0),
      b.id,
      b.batch_number,
      ROW_NUMBER() OVER (PARTITION BY c.name ORDER BY p.name)
    FROM public.equipment_batches b
    JOIN public.equipment_products p ON p.id = b.product_id
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    WHERE b.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND (b.received_qty - b.qty_left) > 0  -- Only include batches with usage
      AND p.is_active = true;

    GET DIAGNOSTICS v_items_added = ROW_COUNT;

  ELSIF p_module = 'veterinarija' THEN
    -- Veterinarija: Get products used from usage_items
    -- Group by product and batch, sum quantities
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
      line_number
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      p.product_code,
      p.category,
      p.primary_pack_unit,
      SUM(ui.qty) as quantity_used,
      COALESCE(AVG(b.purchase_price / NULLIF(b.received_qty, 0)), 0),
      SUM(ui.qty) * COALESCE(AVG(b.purchase_price / NULLIF(b.received_qty, 0)), 0),
      b.id,
      COALESCE(b.batch_number, b.lot),
      ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.name)
    FROM public.usage_items ui
    JOIN public.batches b ON b.id = ui.batch_id
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND ui.qty > 0
    GROUP BY p.id, p.name, p.product_code, p.category, p.primary_pack_unit, b.id, b.batch_number, b.lot
    HAVING SUM(ui.qty) > 0;

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION populate_write_off_act(UUID, TEXT, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION populate_write_off_act IS 'Auto-populates a write-off act with products used during the specified period';
