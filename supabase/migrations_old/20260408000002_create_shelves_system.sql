-- ============================================================================
-- SHELVES SYSTEM (STALAŽAI) - WAREHOUSE ORGANIZATION
-- ============================================================================
-- This migration creates the shelves and compartments system for warehouse
-- organization with support for tractor/heavy transport categorization
-- ============================================================================

-- ============================================================================
-- STEP 1: Create shelves table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.equipment_shelves IS 'Warehouse shelves (Stalažai) for organizing equipment and products';
COMMENT ON COLUMN public.equipment_shelves.shelf_number IS 'Unique shelf identifier (e.g., "1", "2", "A", "B")';
COMMENT ON COLUMN public.equipment_shelves.name IS 'Display name for the shelf';
COMMENT ON COLUMN public.equipment_shelves.location IS 'Physical location in warehouse';

CREATE INDEX idx_equipment_shelves_active ON public.equipment_shelves(is_active);
CREATE INDEX idx_equipment_shelves_shelf_number ON public.equipment_shelves(shelf_number);

-- ============================================================================
-- STEP 2: Create compartments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_shelf_compartments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID NOT NULL REFERENCES public.equipment_shelves(id) ON DELETE CASCADE,
    compartment_code TEXT NOT NULL,
    description TEXT,
    vehicle_category TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_shelf_compartment UNIQUE(shelf_id, compartment_code),
    CONSTRAINT compartment_vehicle_category_check CHECK (vehicle_category IS NULL OR vehicle_category = ANY (ARRAY['tractor'::text, 'heavy_transport'::text]))
);

COMMENT ON TABLE public.equipment_shelf_compartments IS 'Compartments within shelves for detailed organization';
COMMENT ON COLUMN public.equipment_shelf_compartments.compartment_code IS 'Compartment identifier (e.g., "B2", "C3", "A1")';
COMMENT ON COLUMN public.equipment_shelf_compartments.vehicle_category IS 'Optional: tractor or heavy_transport to indicate what type of items stored';
COMMENT ON COLUMN public.equipment_shelf_compartments.description IS 'What is stored in this compartment';

CREATE INDEX idx_equipment_shelf_compartments_shelf ON public.equipment_shelf_compartments(shelf_id);
CREATE INDEX idx_equipment_shelf_compartments_active ON public.equipment_shelf_compartments(is_active);
CREATE INDEX idx_equipment_shelf_compartments_category ON public.equipment_shelf_compartments(vehicle_category) WHERE vehicle_category IS NOT NULL;

-- ============================================================================
-- STEP 3: Add compartment_id to equipment_invoice_item_assignments
-- ============================================================================

ALTER TABLE public.equipment_invoice_item_assignments 
ADD COLUMN IF NOT EXISTS compartment_id UUID REFERENCES public.equipment_shelf_compartments(id);

COMMENT ON COLUMN public.equipment_invoice_item_assignments.compartment_id IS 'Shelf compartment where the item is stored';

CREATE INDEX IF NOT EXISTS idx_equipment_invoice_item_assignments_compartment 
ON public.equipment_invoice_item_assignments(compartment_id) 
WHERE compartment_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Update assignment_type constraint to include 'shelf'
-- ============================================================================

ALTER TABLE public.equipment_invoice_item_assignments 
DROP CONSTRAINT IF EXISTS equipment_invoice_item_assignments_assignment_type_check;

ALTER TABLE public.equipment_invoice_item_assignments 
ADD CONSTRAINT equipment_invoice_item_assignments_assignment_type_check 
CHECK (assignment_type = ANY (ARRAY[
  'vehicle'::text, 
  'tool'::text, 
  'building'::text, 
  'general_farm'::text, 
  'cost_center'::text, 
  'transport_service'::text,
  'worker'::text,
  'shelf'::text
]));

-- ============================================================================
-- STEP 5: Create view for shelf compartment contents
-- ============================================================================

CREATE OR REPLACE VIEW equipment_shelf_compartment_contents AS
SELECT 
    s.id AS shelf_id,
    s.shelf_number,
    s.name AS shelf_name,
    s.location AS shelf_location,
    c.id AS compartment_id,
    c.compartment_code,
    c.description AS compartment_description,
    c.vehicle_category AS compartment_vehicle_category,
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
FROM equipment_shelf_compartments c
JOIN equipment_shelves s ON s.id = c.shelf_id
LEFT JOIN equipment_invoice_item_assignments eia ON eia.compartment_id = c.id
LEFT JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
LEFT JOIN equipment_invoices ei ON ei.id = eii.invoice_id
LEFT JOIN equipment_products ep ON ep.id = eii.product_id
LEFT JOIN equipment_categories ec ON ec.id = ep.category_id
LEFT JOIN users u ON u.id = eia.assigned_by
WHERE s.is_active = true AND c.is_active = true
ORDER BY s.shelf_number, c.compartment_code, ei.invoice_date DESC;

COMMENT ON VIEW equipment_shelf_compartment_contents IS 'View showing all items stored in shelf compartments';

-- ============================================================================
-- STEP 6: Create view for shelf summary
-- ============================================================================

CREATE OR REPLACE VIEW equipment_shelf_summary AS
SELECT 
    s.id AS shelf_id,
    s.shelf_number,
    s.name AS shelf_name,
    s.location,
    s.description,
    COUNT(DISTINCT c.id) AS total_compartments,
    COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) AS active_compartments,
    COUNT(DISTINCT eia.id) AS total_items_stored,
    SUM(eii.total_price) AS total_value,
    MAX(eia.assigned_at) AS last_assignment_date
FROM equipment_shelves s
LEFT JOIN equipment_shelf_compartments c ON c.shelf_id = s.id
LEFT JOIN equipment_invoice_item_assignments eia ON eia.compartment_id = c.id
LEFT JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
WHERE s.is_active = true
GROUP BY s.id, s.shelf_number, s.name, s.location, s.description
ORDER BY s.shelf_number;

COMMENT ON VIEW equipment_shelf_summary IS 'Summary statistics for each shelf';

-- ============================================================================
-- STEP 7: Create view for compartment summary
-- ============================================================================

CREATE OR REPLACE VIEW equipment_compartment_summary AS
SELECT 
    c.id AS compartment_id,
    c.shelf_id,
    s.shelf_number,
    s.name AS shelf_name,
    c.compartment_code,
    c.description AS compartment_description,
    c.vehicle_category,
    COUNT(DISTINCT eia.id) AS items_count,
    SUM(eii.total_price) AS total_value,
    MAX(eia.assigned_at) AS last_assignment_date,
    string_agg(DISTINCT ep.name, ', ' ORDER BY ep.name) AS product_names
FROM equipment_shelf_compartments c
JOIN equipment_shelves s ON s.id = c.shelf_id
LEFT JOIN equipment_invoice_item_assignments eia ON eia.compartment_id = c.id
LEFT JOIN equipment_invoice_items eii ON eii.id = eia.invoice_item_id
LEFT JOIN equipment_products ep ON ep.id = eii.product_id
WHERE c.is_active = true AND s.is_active = true
GROUP BY c.id, c.shelf_id, s.shelf_number, s.name, c.compartment_code, c.description, c.vehicle_category
ORDER BY s.shelf_number, c.compartment_code;

COMMENT ON VIEW equipment_compartment_summary IS 'Summary of items in each compartment';

-- ============================================================================
-- STEP 8: Create helper function to get compartments by category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_compartments_by_category(category_filter text DEFAULT NULL)
RETURNS TABLE (
    compartment_id uuid,
    shelf_id uuid,
    shelf_number text,
    shelf_name text,
    compartment_code text,
    full_code text,
    description text,
    vehicle_category text,
    items_count bigint,
    total_value numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS compartment_id,
        c.shelf_id,
        s.shelf_number,
        s.name AS shelf_name,
        c.compartment_code,
        (s.shelf_number || '-' || c.compartment_code) AS full_code,
        c.description,
        c.vehicle_category,
        COALESCE(cs.items_count, 0) AS items_count,
        COALESCE(cs.total_value, 0) AS total_value
    FROM equipment_shelf_compartments c
    JOIN equipment_shelves s ON s.id = c.shelf_id
    LEFT JOIN equipment_compartment_summary cs ON cs.compartment_id = c.id
    WHERE c.is_active = true 
        AND s.is_active = true
        AND (category_filter IS NULL OR c.vehicle_category = category_filter)
    ORDER BY s.shelf_number, c.compartment_code;
END;
$$;

COMMENT ON FUNCTION get_compartments_by_category IS 'Get compartments filtered by vehicle category (tractor or heavy_transport)';

GRANT EXECUTE ON FUNCTION get_compartments_by_category TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 9: Grant permissions
-- ============================================================================

ALTER TABLE public.equipment_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_shelf_compartments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on equipment_shelves" ON public.equipment_shelves;
CREATE POLICY "Allow all operations on equipment_shelves" ON public.equipment_shelves USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on equipment_shelf_compartments" ON public.equipment_shelf_compartments;
CREATE POLICY "Allow all operations on equipment_shelf_compartments" ON public.equipment_shelf_compartments USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.equipment_shelves TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.equipment_shelf_compartments TO anon, authenticated, service_role;
GRANT SELECT ON equipment_shelf_compartment_contents TO anon, authenticated, service_role;
GRANT SELECT ON equipment_shelf_summary TO anon, authenticated, service_role;
GRANT SELECT ON equipment_compartment_summary TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 10: Create updated trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_shelves_updated_at ON public.equipment_shelves;
CREATE TRIGGER update_equipment_shelves_updated_at
    BEFORE UPDATE ON public.equipment_shelves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_shelf_compartments_updated_at ON public.equipment_shelf_compartments;
CREATE TRIGGER update_equipment_shelf_compartments_updated_at
    BEFORE UPDATE ON public.equipment_shelf_compartments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES AND USAGE EXAMPLES
-- ============================================================================

-- Example 1: Create a shelf
-- INSERT INTO equipment_shelves (shelf_number, name, description, location)
-- VALUES ('1', 'Stalažas 1', 'Pagrindinis stalažas', 'Sandėlio kairė pusė');

-- Example 2: Create compartments for the shelf
-- INSERT INTO equipment_shelf_compartments (shelf_id, compartment_code, description, vehicle_category)
-- VALUES 
--   ('shelf-uuid', 'B2', 'Filtrai traktoriams', 'tractor'),
--   ('shelf-uuid', 'C3', 'Įrankiai', NULL);

-- Example 3: Assign product to compartment
-- INSERT INTO equipment_invoice_item_assignments (
--   invoice_item_id, 
--   assignment_type, 
--   compartment_id,
--   notes, 
--   assigned_by
-- ) VALUES (
--   'invoice_item_uuid', 
--   'shelf', 
--   'compartment_uuid',
--   'Filtrai traktoriui John Deere', 
--   'admin_user_uuid'
-- );

-- Example 4: Get all compartments for tractors
-- SELECT * FROM get_compartments_by_category('tractor');

-- Example 5: Get all compartments for heavy transport
-- SELECT * FROM get_compartments_by_category('heavy_transport');

-- Example 6: View shelf contents
-- SELECT * FROM equipment_shelf_compartment_contents WHERE shelf_id = 'shelf-uuid';

-- Example 7: View shelf summary
-- SELECT * FROM equipment_shelf_summary;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
