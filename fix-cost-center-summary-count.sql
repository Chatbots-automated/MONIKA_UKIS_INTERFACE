/*
  # Fix Cost Center Summary Count Mismatch

  Problem: The summary shows "Produktų: 2" but detail view shows only 1 item

  Root Cause:
  - cost_center_summary counts ALL assignments for a cost center
  - cost_center_parts_usage only shows assignments where assignment_type = 'cost_center'

  Solution: Add the same WHERE filter to both views so counts match
*/

-- Recreate cost_center_summary view with proper filtering
CREATE OR REPLACE VIEW public.cost_center_summary AS
SELECT
  cc.id as cost_center_id,
  cc.name as cost_center_name,
  cc.description,
  cc.color,
  cc.is_active,
  COUNT(DISTINCT eia.id) as total_assignments,
  COALESCE(SUM(eii.total_price), 0) as total_cost,
  MIN(ei.invoice_date) as first_assignment_date,
  MAX(ei.invoice_date) as last_assignment_date
FROM public.cost_centers cc
LEFT JOIN public.equipment_invoice_item_assignments eia
  ON eia.cost_center_id = cc.id
  AND eia.assignment_type = 'cost_center'  -- Added filter to match detail view
LEFT JOIN public.equipment_invoice_items eii ON eii.id = eia.invoice_item_id
LEFT JOIN public.equipment_invoices ei ON ei.id = eii.invoice_id
WHERE cc.is_active = true
GROUP BY cc.id, cc.name, cc.description, cc.color, cc.is_active
ORDER BY cc.name;

-- Grant access to view
GRANT SELECT ON public.cost_center_summary TO anon, authenticated;
