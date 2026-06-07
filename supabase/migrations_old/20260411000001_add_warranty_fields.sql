-- Add warranty period field to tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS warranty_period_months integer;

-- Add warranty period field to equipment_products table
ALTER TABLE equipment_products ADD COLUMN IF NOT EXISTS warranty_period_months integer;

-- Add comment to explain the field
COMMENT ON COLUMN tools.warranty_period_months IS 'Warranty period in months (garantinis laikotarpis mėnesiais)';
COMMENT ON COLUMN equipment_products.warranty_period_months IS 'Warranty period in months (garantinis laikotarpis mėnesiais)';
