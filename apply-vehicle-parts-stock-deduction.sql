/*
  # Add Stock Deduction Trigger for Vehicle Visit Parts

  1. Trigger Function
    - Automatically deduct stock from batches when parts are added to vehicle service visits
    - Update batch qty_left when parts are used
    - Restore stock when parts are deleted

  2. Security
    - No RLS changes needed (tables already have RLS)
*/

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS trigger_vehicle_visit_part_stock_deduction ON vehicle_visit_parts;
DROP TRIGGER IF EXISTS trigger_vehicle_visit_part_stock_restoration ON vehicle_visit_parts;
DROP FUNCTION IF EXISTS handle_vehicle_visit_part_stock();
DROP FUNCTION IF EXISTS restore_vehicle_visit_part_stock();

-- Create function to handle stock deduction for vehicle visit parts
CREATE OR REPLACE FUNCTION handle_vehicle_visit_part_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_qty_left numeric;
  v_product_name text;
BEGIN
  -- Get current batch quantity and product name for error messages
  SELECT b.qty_left, p.name INTO v_batch_qty_left, v_product_name
  FROM batches b
  JOIN products p ON p.id = b.product_id
  WHERE b.id = NEW.batch_id;

  -- Check if batch has enough stock
  IF v_batch_qty_left IS NULL THEN
    RAISE EXCEPTION 'Partija nerasta';
  END IF;

  IF v_batch_qty_left < NEW.quantity_used THEN
    RAISE EXCEPTION 'Nepakankamos atsargos produktui "%". Reikalinga: %, Turima: %',
      v_product_name, NEW.quantity_used, v_batch_qty_left;
  END IF;

  -- Deduct from batch
  UPDATE batches
  SET qty_left = qty_left - NEW.quantity_used
  WHERE id = NEW.batch_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_vehicle_visit_part_stock_deduction
  BEFORE INSERT ON vehicle_visit_parts
  FOR EACH ROW
  EXECUTE FUNCTION handle_vehicle_visit_part_stock();

-- Create function to handle stock restoration when parts are deleted
CREATE OR REPLACE FUNCTION restore_vehicle_visit_part_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Add back to batch
  UPDATE batches
  SET qty_left = qty_left + OLD.quantity_used
  WHERE id = OLD.batch_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for DELETE operations
CREATE TRIGGER trigger_vehicle_visit_part_stock_restoration
  BEFORE DELETE ON vehicle_visit_parts
  FOR EACH ROW
  EXECUTE FUNCTION restore_vehicle_visit_part_stock();
