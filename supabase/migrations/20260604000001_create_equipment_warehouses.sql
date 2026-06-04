-- Create equipment_warehouses table for custom warehouses
CREATE TABLE IF NOT EXISTS equipment_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add warehouse_id to equipment_invoice_item_assignments
ALTER TABLE equipment_invoice_item_assignments
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES equipment_warehouses(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_invoice_item_assignments_warehouse 
ON equipment_invoice_item_assignments(warehouse_id);

-- Insert some default warehouses
INSERT INTO equipment_warehouses (name, description, location) VALUES
  ('Pagrindinis sandėlis', 'Centrinis atsargų sandėlis', 'Pagrindinis kompleksas'),
  ('Truck sandėlis', 'Sunkvežimių dalių sandėlis', 'Garažas A'),
  ('Car sandėlis', 'Lengvųjų automobilių dalių sandėlis', 'Garažas B')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE equipment_warehouses IS 'Custom warehouses for storing equipment parts and supplies';
