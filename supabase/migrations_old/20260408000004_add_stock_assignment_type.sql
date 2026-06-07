-- ============================================================================
-- Add 'stock' assignment type for spare parts inventory
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
  'shelf'::text,
  'stock'::text,
  'periodic_service'::text,
  'breakdown_repair'::text,
  'parts_replacement'::text,
  'modernization'::text,
  'safety_inspection'::text,
  'cleaning_maintenance'::text
]));

COMMENT ON CONSTRAINT equipment_invoice_item_assignments_assignment_type_check 
ON equipment_invoice_item_assignments IS 
'Valid assignment types: vehicle, tool, building, general_farm, cost_center, transport_service, worker, shelf, stock (spare parts), and farm equipment maintenance categories';
