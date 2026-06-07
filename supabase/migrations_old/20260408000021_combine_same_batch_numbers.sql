-- Option to combine batches with the same batch_number into one line
-- This aggregates by product + batch_number instead of product + batch_id

CREATE OR REPLACE FUNCTION populate_write_off_act_combined(
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
BEGIN
  -- Clear existing items
  DELETE FROM public.write_off_act_items WHERE act_id = p_act_id;

  IF p_module = 'technika' THEN
    -- Technika: Combine by product + batch_number
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
      batch_number,
      batch_lot,
      line_number,
      received_qty,
      qty_remaining,
      notes
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      p.product_code,
      translate_category_to_lithuanian(c.name),
      p.unit_type,
      SUM(b.received_qty - b.qty_left) as quantity_used,
      AVG(COALESCE(b.purchase_price, 0)) as avg_unit_price,
      SUM((b.received_qty - b.qty_left) * COALESCE(b.purchase_price, 0)) as total_price,
      b.batch_number,
      STRING_AGG(DISTINCT b.lot_number, ', '),
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(c.name) ORDER BY p.name, b.batch_number),
      SUM(b.received_qty),
      SUM(b.qty_left),
      CASE 
        WHEN COUNT(DISTINCT b.id) > 1 
        THEN COUNT(DISTINCT b.id)::TEXT || ' partijos su tuo pačiu numeriu'
        ELSE NULL
      END
    FROM public.equipment_batches b
    JOIN public.equipment_products p ON p.id = b.product_id
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    WHERE b.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND (b.received_qty - b.qty_left) > 0
      AND p.is_active = true
    GROUP BY p.id, p.name, p.product_code, c.name, p.unit_type, b.batch_number
    ORDER BY translate_category_to_lithuanian(c.name), p.name, b.batch_number;

    GET DIAGNOSTICS v_items_added = ROW_COUNT;

  ELSIF p_module = 'veterinarija' THEN
    -- Veterinarija: Combine by product + batch_number
    INSERT INTO public.write_off_act_items (
      act_id,
      product_id,
      product_name,
      category_name,
      unit_type,
      quantity_used,
      unit_price,
      total_price,
      batch_number,
      batch_lot,
      line_number,
      received_qty,
      qty_remaining,
      notes
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      translate_category_to_lithuanian(p.category::TEXT),
      p.primary_pack_unit::TEXT,
      SUM(ui.qty) as total_qty_used,
      -- Weighted average unit price
      SUM(ui.qty * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0)) / NULLIF(SUM(ui.qty), 0) as weighted_avg_price,
      SUM(ui.qty * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0)) as total_price,
      COALESCE(MAX(b.batch_number), MAX(b.lot)),
      STRING_AGG(DISTINCT b.lot, ', '),
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(p.category::TEXT) ORDER BY p.name, MAX(b.batch_number)),
      SUM(b.received_qty),
      SUM(b.qty_left) + SUM(COALESCE((
        SELECT SUM(ui2.qty)
        FROM public.usage_items ui2
        WHERE ui2.batch_id = b.id
          AND ui2.created_at::DATE > p_period_end
      ), 0)),
      CASE 
        WHEN COUNT(DISTINCT b.id) > 1 
        THEN COUNT(DISTINCT b.id)::TEXT || ' partijos su tuo pačiu numeriu'
        ELSE NULL
      END
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
      COALESCE(b.batch_number, b.lot)
    HAVING SUM(ui.qty) > 0
    ORDER BY translate_category_to_lithuanian(p.category::TEXT), p.name, MAX(b.batch_number);

    GET DIAGNOSTICS v_items_added = ROW_COUNT;
  END IF;

  -- Calculate total
  SELECT COALESCE(SUM(total_price), 0) INTO v_total_amount
  FROM public.write_off_act_items
  WHERE act_id = p_act_id;

  UPDATE public.write_off_acts
  SET total_amount = v_total_amount, updated_at = NOW()
  WHERE id = p_act_id;

  RETURN QUERY SELECT v_items_added, v_total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION populate_write_off_act_combined(UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION populate_write_off_act_combined(UUID, TEXT, DATE, DATE) TO anon;

COMMENT ON FUNCTION populate_write_off_act_combined IS 'Combines batches with same batch_number. Shows total usage and weighted average price. Adds note if multiple physical batches share same number.';
