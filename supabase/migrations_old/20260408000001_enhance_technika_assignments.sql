-- ============================================================================
-- ENHANCE TECHNIKA MODULE - TECHNIKOS KIEMAS
-- ============================================================================
-- This migration enhances the technika module with:
-- 1. Worker assignments for equipment/products
-- 2. Enhanced vehicle type classification (tractor vs heavy transport)
-- 3. Improved assignment modal with separate sections for workers and vehicles
-- ============================================================================

-- ============================================================================
-- STEP 1: Add vehicle_category to vehicles table
-- ============================================================================
-- This allows distinguishing between tractors and heavy transport vehicles

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS vehicle_category text;

COMMENT ON COLUMN vehicles.vehicle_category IS 'Category: tractor or heavy_transport (sunkvezimiai)';

-- Update existing vehicles based on vehicle_type
UPDATE vehicles 
SET vehicle_category = CASE 
  WHEN vehicle_type = 'tractor' THEN 'tractor'
  WHEN vehicle_type IN ('truck', 'semi_trailer') THEN 'heavy_transport'
  ELSE NULL
END
WHERE vehicle_category IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicles_category 
ON vehicles(vehicle_category) 
WHERE vehicle_category IS NOT NULL;

-- ============================================================================
-- STEP 2: Add worker_id to equipment_invoice_item_assignments
-- ============================================================================
-- This allows assigning products directly to workers

ALTER TABLE equipment_invoice_item_assignments 
ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES users(id);

COMMENT ON COLUMN equipment_invoice_item_assignments.worker_id IS 'Worker (user) to whom the product/item is assigned';

-- Create index for faster worker assignment queries
CREATE INDEX IF NOT EXISTS idx_equipment_invoice_item_assignments_worker 
ON equipment_invoice_item_assignments(worker_id) 
WHERE worker_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Update assignment_type constraint to include 'worker'
-- ============================================================================

ALTER TABLE equipment_invoice_item_assignments 
DROP CONSTRAINT IF EXISTS equipment_invoice_item_assignments_assignment_type_check;

ALTER TABLE equipment_invoice_item_assignments 
ADD CONSTRAINT equipment_invoice_item_assignments_assignment_type_check 
CHECK (assignment_type = ANY (ARRAY[
  'vehicle'::text, 
  'tool'::text, 
  'building'::text, 
  'general_farm'::text, 
  'cost_center'::text, 
  'transport_service'::text,
  'worker'::text
]));

-- ============================================================================
-- STEP 4: Create view for worker assignments
-- ============================================================================

CREATE OR REPLACE VIEW worker_equipment_assignments AS
SELECT 
  u.id AS worker_id,
  u.full_name AS worker_name,
  u.email AS worker_email,
  ei.id AS invoice_id,
  ei.invoice_number,
  ei.invoice_date,
  ei.supplier_name,
  ep.id AS product_id,
  ep.name AS product_name,
  ep.product_code,
  ep.unit_type,
  ec.name AS category_name,
  eii.id AS item_id,
  eii.description AS item_description,
  eii.quantity,
  eii.unit_price,
  eii.total_price,
  eia.notes AS assignment_notes,
  eia.assigned_at,
  assigned_by_user.full_name AS assigned_by_name
FROM equipment_invoice_item_assignments eia
JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
JOIN equipment_invoices ei ON ei.id = eii.invoice_id
LEFT JOIN equipment_products ep ON ep.id = eii.product_id
LEFT JOIN equipment_categories ec ON ec.id = ep.category_id
LEFT JOIN users u ON u.id = eia.worker_id
LEFT JOIN users assigned_by_user ON assigned_by_user.id = eia.assigned_by
WHERE eia.assignment_type = 'worker'
ORDER BY u.full_name, ei.invoice_date DESC;

COMMENT ON VIEW worker_equipment_assignments IS 'View showing all equipment/products assigned to workers';

-- ============================================================================
-- STEP 5: Create view for vehicle assignments with category
-- ============================================================================

CREATE OR REPLACE VIEW vehicle_equipment_assignments AS
SELECT 
  v.id AS vehicle_id,
  v.registration_number,
  v.vehicle_type,
  v.vehicle_category,
  v.make,
  v.model,
  v.year,
  ei.id AS invoice_id,
  ei.invoice_number,
  ei.invoice_date,
  ei.supplier_name,
  ep.id AS product_id,
  ep.name AS product_name,
  ep.product_code,
  ep.unit_type,
  ec.name AS category_name,
  eii.id AS item_id,
  eii.description AS item_description,
  eii.quantity,
  eii.unit_price,
  eii.total_price,
  eia.notes AS assignment_notes,
  eia.assigned_at,
  u.full_name AS assigned_by_name
FROM equipment_invoice_item_assignments eia
JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
JOIN equipment_invoices ei ON ei.id = eii.invoice_id
LEFT JOIN equipment_products ep ON ep.id = eii.product_id
LEFT JOIN equipment_categories ec ON ec.id = ep.category_id
LEFT JOIN vehicles v ON v.id = eia.vehicle_id
LEFT JOIN users u ON u.id = eia.assigned_by
WHERE eia.assignment_type = 'vehicle'
ORDER BY v.registration_number, ei.invoice_date DESC;

COMMENT ON VIEW vehicle_equipment_assignments IS 'View showing all equipment/products assigned to vehicles with category information';

-- ============================================================================
-- STEP 6: Update unassigned invoice items view to include new assignment types
-- ============================================================================

DROP VIEW IF EXISTS equipment_unassigned_invoice_items;

CREATE OR REPLACE VIEW equipment_unassigned_invoice_items AS
SELECT 
  eii.id AS item_id,
  eii.invoice_id,
  ei.invoice_number,
  ei.invoice_date,
  ei.supplier_name,
  eii.product_id,
  ep.name AS product_name,
  ep.product_code,
  eii.description,
  eii.quantity,
  eii.unit_price,
  eii.total_price,
  ec.name AS category_name,
  eii.created_at
FROM equipment_invoice_items eii
JOIN equipment_invoices ei ON ei.id = eii.invoice_id
LEFT JOIN equipment_products ep ON ep.id = eii.product_id
LEFT JOIN equipment_categories ec ON ec.id = ep.category_id
WHERE NOT EXISTS (
  SELECT 1 
  FROM equipment_invoice_item_assignments eia 
  WHERE eia.invoice_item_id = eii.id
)
ORDER BY ei.invoice_date DESC, eii.line_no;

COMMENT ON VIEW equipment_unassigned_invoice_items IS 'View showing invoice items that have not been assigned to any worker, vehicle, tool, cost center, or other category';

-- ============================================================================
-- STEP 7: Create summary view for worker assignments
-- ============================================================================

CREATE OR REPLACE VIEW worker_assignment_summary AS
SELECT 
  u.id AS worker_id,
  u.full_name AS worker_name,
  u.email AS worker_email,
  COUNT(DISTINCT eia.id) AS total_assignments,
  COUNT(DISTINCT eii.product_id) AS unique_products,
  SUM(eii.total_price) AS total_cost,
  MAX(eia.assigned_at) AS last_assignment_date
FROM users u
LEFT JOIN equipment_invoice_item_assignments eia ON eia.worker_id = u.id AND eia.assignment_type = 'worker'
LEFT JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
WHERE u.is_frozen = false
GROUP BY u.id, u.full_name, u.email
HAVING COUNT(DISTINCT eia.id) > 0
ORDER BY u.full_name;

COMMENT ON VIEW worker_assignment_summary IS 'Summary of equipment assignments per worker';

-- ============================================================================
-- STEP 8: Create summary view for vehicle assignments by category
-- ============================================================================

CREATE OR REPLACE VIEW vehicle_assignment_summary AS
SELECT 
  v.id AS vehicle_id,
  v.registration_number,
  v.vehicle_type,
  v.vehicle_category,
  v.make,
  v.model,
  COUNT(DISTINCT eia.id) AS total_assignments,
  COUNT(DISTINCT eii.product_id) AS unique_products,
  SUM(eii.total_price) AS total_cost,
  MAX(eia.assigned_at) AS last_assignment_date
FROM vehicles v
LEFT JOIN equipment_invoice_item_assignments eia ON eia.vehicle_id = v.id AND eia.assignment_type = 'vehicle'
LEFT JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
WHERE v.is_active = true
GROUP BY v.id, v.registration_number, v.vehicle_type, v.vehicle_category, v.make, v.model
HAVING COUNT(DISTINCT eia.id) > 0
ORDER BY v.registration_number;

COMMENT ON VIEW vehicle_assignment_summary IS 'Summary of equipment assignments per vehicle with category';

-- ============================================================================
-- STEP 9: Grant permissions on new views
-- ============================================================================

GRANT SELECT ON worker_equipment_assignments TO anon, authenticated, service_role;
GRANT SELECT ON vehicle_equipment_assignments TO anon, authenticated, service_role;
GRANT SELECT ON worker_assignment_summary TO anon, authenticated, service_role;
GRANT SELECT ON vehicle_assignment_summary TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 10: Create helper function to get vehicles by category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_vehicles_by_category(category_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  registration_number text,
  vehicle_type text,
  vehicle_category text,
  make text,
  model text,
  year integer,
  status text,
  current_mileage numeric,
  current_engine_hours numeric,
  assigned_to uuid,
  assignee_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.registration_number,
    v.vehicle_type,
    v.vehicle_category,
    v.make,
    v.model,
    v.year,
    v.status,
    v.current_mileage,
    v.current_engine_hours,
    v.assigned_to,
    u.full_name AS assignee_name
  FROM vehicles v
  LEFT JOIN users u ON u.id = v.assigned_to
  WHERE v.is_active = true
    AND (category_filter IS NULL OR v.vehicle_category = category_filter)
  ORDER BY v.registration_number;
END;
$$;

COMMENT ON FUNCTION get_vehicles_by_category IS 'Get vehicles filtered by category (tractor or heavy_transport)';

GRANT EXECUTE ON FUNCTION get_vehicles_by_category TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 11: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_equipment_invoice_item_assignments_type_worker 
ON equipment_invoice_item_assignments(assignment_type, worker_id) 
WHERE assignment_type = 'worker';

CREATE INDEX IF NOT EXISTS idx_equipment_invoice_item_assignments_type_vehicle 
ON equipment_invoice_item_assignments(assignment_type, vehicle_id) 
WHERE assignment_type = 'vehicle';

-- ============================================================================
-- NOTES AND USAGE EXAMPLES
-- ============================================================================

-- Example 1: Assign a product to a worker
-- INSERT INTO equipment_invoice_item_assignments (
--   invoice_item_id, 
--   assignment_type, 
--   worker_id, 
--   notes, 
--   assigned_by
-- ) VALUES (
--   'invoice_item_uuid', 
--   'worker', 
--   'worker_user_uuid', 
--   'Safety boots for winter season', 
--   'admin_user_uuid'
-- );

-- Example 2: Assign a product to a tractor
-- INSERT INTO equipment_invoice_item_assignments (
--   invoice_item_id, 
--   assignment_type, 
--   vehicle_id, 
--   notes, 
--   assigned_by
-- ) VALUES (
--   'invoice_item_uuid', 
--   'vehicle', 
--   'tractor_vehicle_uuid', 
--   'Oil filter replacement', 
--   'admin_user_uuid'
-- );

-- Example 3: Get all tractors
-- SELECT * FROM get_vehicles_by_category('tractor');

-- Example 4: Get all heavy transport vehicles
-- SELECT * FROM get_vehicles_by_category('heavy_transport');

-- Example 5: Get all worker assignments
-- SELECT * FROM worker_equipment_assignments WHERE worker_id = 'specific_worker_uuid';

-- Example 6: Get all vehicle assignments for tractors
-- SELECT * FROM vehicle_equipment_assignments WHERE vehicle_category = 'tractor';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- 1. Added vehicle_category column to vehicles table
-- 2. Added worker_id column to equipment_invoice_item_assignments table
-- 3. Updated assignment_type constraint to include 'worker'
-- 4. Created views for worker and vehicle assignments
-- 5. Created summary views for reporting
-- 6. Added helper function to filter vehicles by category
-- 7. Added performance indexes
-- ============================================================================
