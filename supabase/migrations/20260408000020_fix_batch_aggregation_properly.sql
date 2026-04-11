-- Fix batch aggregation to ensure each unique batch appears only ONCE
-- The issue: same batch_id appearing multiple times due to improper grouping

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
      batch_lot,
      batch_created_date,
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
      b.lot_number,
      b.created_at::DATE,
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(c.name) ORDER BY p.name, b.created_at),
      b.received_qty,
      b.qty_left
    FROM public.equipment_batches b
    JOIN public.equipment_products p ON p.id = b.product_id
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    WHERE b.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND (b.received_qty - b.qty_left) > 0
      AND p.is_active = true
    ORDER BY translate_category_to_lithuanian(c.name), p.name, b.created_at;

    GET DIAGNOSTICS v_items_added = ROW_COUNT;

  ELSIF p_module = 'veterinarija' THEN
    -- Veterinarija: Aggregate by batch_id to ensure each batch appears only once
    -- Sum all usage for that batch during the period
    -- Key: GROUP BY must include batch_id and all non-aggregated columns from batch table
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
      batch_lot,
      batch_created_date,
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
      SUM(ui.qty) as quantity_used_in_period,
      -- Use the batch's actual unit price (purchase_price / received_qty)
      COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0) as unit_price,
      -- Total = quantity used * unit price
      SUM(ui.qty) * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0) as total_price,
      b.id,
      COALESCE(b.batch_number, b.lot),
      b.lot,
      b.created_at::DATE,
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(p.category::TEXT) ORDER BY p.name, b.created_at),
      b.received_qty,
      -- Calculate stock AS OF period end: current stock + usage after period
      b.qty_left + COALESCE((
        SELECT SUM(ui2.qty)
        FROM public.usage_items ui2
        WHERE ui2.batch_id = b.id
          AND ui2.created_at::DATE > p_period_end
      ), 0)
    FROM public.usage_items ui
    JOIN public.batches b ON b.id = ui.batch_id
    JOIN public.products p ON p.id = ui.product_id
    WHERE ui.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND ui.qty > 0
    -- Critical: Group by batch_id to ensure each batch appears only once
    GROUP BY 
      p.id, 
      p.name, 
      p.category, 
      p.primary_pack_unit, 
      b.id,  -- This is the key - ensures uniqueness
      b.batch_number, 
      b.lot, 
      b.received_qty, 
      b.qty_left, 
      b.purchase_price,
      b.created_at
    HAVING SUM(ui.qty) > 0
    ORDER BY translate_category_to_lithuanian(p.category::TEXT), p.name, b.created_at;

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

COMMENT ON FUNCTION populate_write_off_act IS 'Populates write-off act. Each unique batch_id appears only once. Sums all usage for that batch during the period.';
