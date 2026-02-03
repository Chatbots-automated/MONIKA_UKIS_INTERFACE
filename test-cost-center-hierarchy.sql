-- Test script to verify the cost center hierarchy aggregation works correctly

-- Step 1: Check the direct summary (should show only direct assignments per cost center)
SELECT 
  cost_center_name,
  parent_id,
  direct_assignments,
  ROUND(direct_cost::numeric, 2) as direct_cost
FROM public.cost_center_direct_summary
ORDER BY cost_center_name;

-- Step 2: Check the hierarchical summary (should show aggregated totals including children)
SELECT 
  cost_center_name,
  parent_id,
  total_assignments,
  ROUND(total_cost::numeric, 2) as total_cost
FROM public.cost_center_summary_with_children
ORDER BY cost_center_name;

-- Step 3: Compare parent direct vs total (to see the aggregation working)
SELECT 
  cds.cost_center_name,
  cds.direct_assignments as "Direct Only",
  cwc.total_assignments as "With Children",
  ROUND(cds.direct_cost::numeric, 2) as "Direct Cost",
  ROUND(cwc.total_cost::numeric, 2) as "Total Cost (incl. children)"
FROM public.cost_center_direct_summary cds
JOIN public.cost_center_summary_with_children cwc ON cwc.cost_center_id = cds.cost_center_id
WHERE cds.parent_id IS NULL  -- Only show parent cost centers
ORDER BY cds.cost_center_name;

-- Step 4: Verify the main view is working
SELECT 
  cost_center_name,
  parent_id,
  total_assignments,
  ROUND(total_cost::numeric, 2) as total_cost
FROM public.cost_center_summary
ORDER BY cost_center_name;

-- Step 5: Detailed breakdown showing parent and all its children
WITH parent_child AS (
  SELECT 
    p.cost_center_name as parent_name,
    p.total_cost as parent_total,
    c.cost_center_name as child_name,
    c.total_cost as child_total
  FROM public.cost_center_summary p
  LEFT JOIN public.cost_center_summary c ON c.parent_id = p.cost_center_id
  WHERE p.parent_id IS NULL
)
SELECT 
  parent_name,
  ROUND(parent_total::numeric, 2) as "Parent Total EUR",
  child_name,
  ROUND(child_total::numeric, 2) as "Child Total EUR"
FROM parent_child
ORDER BY parent_name, child_name;
