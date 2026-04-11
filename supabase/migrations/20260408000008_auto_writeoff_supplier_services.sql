-- Auto-create write-off act for "Tiekėjo paslaugos" (Supplier Services) products
-- When a batch is created for a product with this category, automatically create a write-off act

CREATE OR REPLACE FUNCTION auto_create_writeoff_for_supplier_services()
RETURNS TRIGGER AS $$
DECLARE
  v_category_name TEXT;
  v_product_name TEXT;
  v_product_code TEXT;
  v_unit_type TEXT;
  v_act_id UUID;
  v_act_number TEXT;
  v_invoice_date DATE;
BEGIN
  -- Only process equipment_batches (technika module)
  IF TG_TABLE_NAME = 'equipment_batches' THEN
    -- Get product details and category
    SELECT 
      p.name,
      p.product_code,
      p.unit_type,
      c.name
    INTO 
      v_product_name,
      v_product_code,
      v_unit_type,
      v_category_name
    FROM public.equipment_products p
    LEFT JOIN public.equipment_categories c ON c.id = p.category_id
    WHERE p.id = NEW.product_id;

    -- Check if this is a "Tiekėjo paslaugos" product
    IF v_category_name = 'Tiekėjo paslaugos' THEN
      -- Get invoice date for the act date
      SELECT invoice_date INTO v_invoice_date
      FROM public.equipment_invoices
      WHERE id = NEW.invoice_id;

      v_invoice_date := COALESCE(v_invoice_date, CURRENT_DATE);

      -- Generate act number
      v_act_number := 'NA-' || EXTRACT(YEAR FROM v_invoice_date)::TEXT || '-technika-AUTO-' || 
                      LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');

      -- Create write-off act
      INSERT INTO public.write_off_acts (
        act_number,
        act_date,
        period_start,
        period_end,
        department,
        module,
        status,
        notes,
        created_by
      ) VALUES (
        v_act_number,
        v_invoice_date,
        v_invoice_date,
        v_invoice_date,
        'Tiekėjo paslaugos (automatinis)',
        'technika',
        'approved', -- Auto-approve supplier services
        'Automatiškai sukurtas nurašymo aktas tiekėjo paslaugoms',
        NEW.created_by
      )
      RETURNING id INTO v_act_id;

      -- Add the item to the write-off act
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
        notes
      ) VALUES (
        v_act_id,
        NEW.product_id,
        v_product_name,
        v_product_code,
        v_category_name,
        v_unit_type,
        NEW.received_qty, -- Full quantity is "used" immediately for services
        COALESCE(NEW.purchase_price, 0),
        NEW.received_qty * COALESCE(NEW.purchase_price, 0),
        NEW.id,
        NEW.batch_number,
        1,
        'Automatiškai nurašyta kaip tiekėjo paslauga'
      );

      RAISE NOTICE 'Auto-created write-off act % for supplier service: %', v_act_number, v_product_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on equipment_batches
DROP TRIGGER IF EXISTS trigger_auto_writeoff_supplier_services ON public.equipment_batches;
CREATE TRIGGER trigger_auto_writeoff_supplier_services
AFTER INSERT ON public.equipment_batches
FOR EACH ROW
EXECUTE FUNCTION auto_create_writeoff_for_supplier_services();

COMMENT ON FUNCTION auto_create_writeoff_for_supplier_services IS 'Automatically creates write-off acts for products in the "Tiekėjo paslaugos" category';
