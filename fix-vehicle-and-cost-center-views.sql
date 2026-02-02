/*
  # Fix vehicle and cost center parts tracking

  1. Views
    - Create/update `vehicle_parts_usage` view for vehicle cost tracking
    - Update `cost_center_parts_usage` view with all necessary fields

  2. Changes
    - Ensures vehicle assignments show up in transporto savikaina tab
    - Provides detailed cost center item tracking
*/

-- Create or replace vehicle_parts_usage view
CREATE OR REPLACE VIEW public.vehicle_parts_usage AS
SELECT
  v.id as vehicle_id,
  v.registration_number,
  v.make,
  v.model,
  v.vehicle_type,
  ei.invoice_number,
  ei.invoice_date,
  ei.supplier_name,
  ep.name as product_name,
  ep.product_code,
  eii.description as item_description,
  eii.quantity,
  eii.unit_price,
  eii.total_price,
  eia.notes as assignment_notes,
  eia.assigned_at,
  u.full_name as assigned_by_name
FROM public.equipment_invoice_item_assignments eia
INNER JOIN public.equipment_invoice_items eii ON eii.id = eia.invoice_item_id
INNER JOIN public.equipment_invoices ei ON ei.id = eii.invoice_id
LEFT JOIN public.equipment_products ep ON ep.id = eii.product_id
LEFT JOIN public.vehicles v ON v.id = eia.vehicle_id
LEFT JOIN public.users u ON u.id = eia.assigned_by
WHERE eia.assignment_type = 'vehicle'
ORDER BY v.registration_number, ei.invoice_date DESC;

-- Update cost_center_parts_usage view to include more details
CREATE OR REPLACE VIEW public.cost_center_parts_usage AS
SELECT
  cc.id as cost_center_id,
  cc.name as cost_center_name,
  cc.description as cost_center_description,
  cc.color as cost_center_color,
  ei.id as invoice_id,
  ei.invoice_number,
  ei.invoice_date,
  ei.supplier_name,
  ep.id as product_id,
  ep.name as product_name,
  ep.product_code,
  ep.unit_type,
  ec.name as category_name,
  eii.id as item_id,
  eii.description as item_description,
  eii.quantity,
  eii.unit_price,
  eii.total_price,
  eia.notes as assignment_notes,
  eia.assigned_at,
  u.full_name as assigned_by_name
FROM public.equipment_invoice_item_assignments eia
INNER JOIN public.equipment_invoice_items eii ON eii.id = eia.invoice_item_id
INNER JOIN public.equipment_invoices ei ON ei.id = eii.invoice_id
LEFT JOIN public.equipment_products ep ON ep.id = eii.product_id
LEFT JOIN public.equipment_categories ec ON ec.id = ep.category_id
LEFT JOIN public.cost_centers cc ON cc.id = eia.cost_center_id
LEFT JOIN public.users u ON u.id = eia.assigned_by
WHERE eia.assignment_type = 'cost_center'
ORDER BY cc.name, ei.invoice_date DESC;

-- Grant access to views
GRANT SELECT ON public.vehicle_parts_usage TO anon, authenticated;
GRANT SELECT ON public.cost_center_parts_usage TO anon, authenticated;
