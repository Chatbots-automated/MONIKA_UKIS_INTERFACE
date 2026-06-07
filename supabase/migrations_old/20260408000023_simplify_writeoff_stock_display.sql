-- Simplify write-off act stock display to show CURRENT stock instead of historical
-- This makes it much clearer: Received - Total Used = Current Remaining

-- Update the populate_write_off_act function
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
BEGIN
  -- Clear existing items
  DELETE FROM public.write_off_act_items WHERE act_id = p_act_id;

  IF p_module = 'technika' THEN
    -- Technika: Get products used based on assignment date
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
      eii.quantity as quantity_used,
      COALESCE(b.purchase_price, eii.unit_price, 0) as unit_price,
      eii.quantity * COALESCE(b.purchase_price, eii.unit_price, 0) as total_price,
      b.batch_number,
      b.lot_number,
      b.created_at,
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(c.name) ORDER BY p.name, b.batch_number, eia.assigned_at),
      b.received_qty,
      b.qty_left  -- CURRENT stock, not historical
    FROM public.equipment_invoice_item_assignments eia
    JOIN public.equipment_invoice_items eii ON eii.id = eia.invoice_item_id
    JOIN public.equipment_products p ON p.id = eii.product_id
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    LEFT JOIN public.equipment_batches b ON b.invoice_id = eii.invoice_id AND b.product_id = p.id
    WHERE eia.assigned_at::DATE BETWEEN p_period_start AND p_period_end
      AND eii.quantity > 0
      AND p.is_active = true
    ORDER BY translate_category_to_lithuanian(c.name), p.name, b.batch_number, eia.assigned_at;

    GET DIAGNOSTICS v_items_added = ROW_COUNT;

  ELSIF p_module = 'veterinarija' THEN
    -- Veterinarija: Get products used from usage_items
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
      batch_created_date,
      line_number,
      received_qty,
      qty_remaining
    )
    SELECT
      p_act_id,
      p.id,
      p.name,
      translate_category_to_lithuanian(p.category::TEXT),
      p.primary_pack_unit::TEXT,
      SUM(ui.qty) as total_qty_used,
      COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0) as unit_price,
      SUM(ui.qty) * COALESCE(b.purchase_price / NULLIF(b.received_qty, 0), 0) as total_price,
      COALESCE(b.batch_number, b.lot),
      b.lot,
      b.created_at,
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(p.category::TEXT) ORDER BY p.name, b.batch_number, b.created_at),
      b.received_qty,
      b.qty_left  -- Current remaining in this specific batch
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
      b.purchase_price,
      b.created_at
    HAVING SUM(ui.qty) > 0
    ORDER BY translate_category_to_lithuanian(p.category::TEXT), p.name, b.created_at;

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

-- Update the combined version too
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
    -- Technika: Combine by product + batch_number, using assignment date
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
      SUM(eii.quantity) as total_quantity_used,
      -- Weighted average price
      SUM(eii.quantity * COALESCE(b.purchase_price, eii.unit_price, 0)) / NULLIF(SUM(eii.quantity), 0) as weighted_avg_price,
      SUM(eii.quantity * COALESCE(b.purchase_price, eii.unit_price, 0)) as total_price,
      COALESCE(MAX(b.batch_number), 'N/A'),
      STRING_AGG(DISTINCT b.lot_number, ', '),
      ROW_NUMBER() OVER (PARTITION BY translate_category_to_lithuanian(c.name) ORDER BY p.name, MAX(b.batch_number)),
      SUM(b.received_qty),
      SUM(b.qty_left),  -- CURRENT stock
      CASE 
        WHEN COUNT(DISTINCT b.id) > 1 
        THEN COUNT(DISTINCT b.id)::TEXT || ' partijos su tuo pačiu numeriu'
        WHEN COUNT(DISTINCT eia.id) > 1
        THEN COUNT(DISTINCT eia.id)::TEXT || ' priskyrimai'
        ELSE NULL
      END
    FROM public.equipment_invoice_item_assignments eia
    JOIN public.equipment_invoice_items eii ON eii.id = eia.invoice_item_id
    JOIN public.equipment_products p ON p.id = eii.product_id
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    LEFT JOIN public.equipment_batches b ON b.invoice_id = eii.invoice_id AND b.product_id = p.id
    WHERE eia.assigned_at::DATE BETWEEN p_period_start AND p_period_end
      AND eii.quantity > 0
      AND p.is_active = true
    GROUP BY 
      p.id, 
      p.name, 
      p.product_code, 
      c.name, 
      p.unit_type,
      COALESCE(b.batch_number, 'N/A')
    ORDER BY translate_category_to_lithuanian(c.name), p.name, MAX(b.batch_number);

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
      SUM(b.qty_left),  -- CURRENT stock
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION populate_write_off_act(UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION populate_write_off_act(UUID, TEXT, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION populate_write_off_act_combined(UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION populate_write_off_act_combined(UUID, TEXT, DATE, DATE) TO anon;

COMMENT ON FUNCTION populate_write_off_act IS 'Shows CURRENT stock remaining (not historical). Panaudota = used during period, Likutis = current stock in batch.';
COMMENT ON FUNCTION populate_write_off_act_combined IS 'Combined version - shows CURRENT stock remaining. Merges batches with same batch_number.';
