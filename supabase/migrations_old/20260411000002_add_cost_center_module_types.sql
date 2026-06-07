-- Add module_type field to cost_centers table to differentiate between technika and farm_equipment
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS module_type text DEFAULT 'technika' NOT NULL;

-- Add check constraint to ensure valid module types
ALTER TABLE cost_centers DROP CONSTRAINT IF EXISTS cost_centers_module_type_check;
ALTER TABLE cost_centers ADD CONSTRAINT cost_centers_module_type_check 
  CHECK (module_type IN ('technika', 'farm_equipment'));

-- Add comment to explain the field
COMMENT ON COLUMN cost_centers.module_type IS 'Module type: technika (Technikos kiemas) or farm_equipment (Fermos įranga)';

-- Create index for faster filtering by module type
CREATE INDEX IF NOT EXISTS idx_cost_centers_module_type ON cost_centers(module_type);

-- Update the cost_center_summary view to include module_type
DROP VIEW IF EXISTS cost_center_summary CASCADE;

CREATE OR REPLACE VIEW cost_center_summary AS
SELECT 
  cc.id AS cost_center_id,
  cc.name AS cost_center_name,
  cc.description,
  cc.color,
  cc.parent_id,
  cc.is_active,
  cc.module_type,
  cc.is_service,
  cc.service_type,
  cc.service_worker_ids,
  cc.service_company_name,
  COUNT(DISTINCT eiia.id) AS total_assignments,
  COALESCE(SUM(eii.total_price), 0) AS total_cost,
  MIN(ei.invoice_date) AS first_assignment_date,
  MAX(ei.invoice_date) AS last_assignment_date
FROM cost_centers cc
LEFT JOIN equipment_invoice_item_assignments eiia ON eiia.cost_center_id = cc.id
LEFT JOIN equipment_invoice_items eii ON eii.id = eiia.invoice_item_id
LEFT JOIN equipment_invoices ei ON ei.id = eii.invoice_id
WHERE cc.is_active = true
GROUP BY 
  cc.id, cc.name, cc.description, cc.color, cc.parent_id, 
  cc.is_active, cc.module_type, cc.is_service, cc.service_type, 
  cc.service_worker_ids, cc.service_company_name;

-- Grant permissions
GRANT SELECT ON cost_center_summary TO authenticated;
