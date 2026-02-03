# Apply Hierarchical Cost Center Summary Migration

## Problem
Parent cost centers are not showing the aggregated totals of their child cost centers. For example:
- Parent has 2 products worth 288.32 EUR
- Child 1 has 1 product worth 126.60 EUR  
- Child 2 has 1 product worth 126.60 EUR
- **Total should be**: 288.32 + 126.60 + 126.60 = 541.52 EUR
- **But parent only shows**: 288.32 EUR (missing children)

## Solution
Create a new view that recursively aggregates child cost center totals into parent totals.

## Steps to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20240205000000_cost_center_hierarchical_summary.sql`
4. Click **Run**

### Option 2: Using psql or Database Client

```bash
psql "postgresql://postgres.hdwlwtnnhbbhemgfnszm:OksanaVartotojas2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20240205000000_cost_center_hierarchical_summary.sql
```

### Option 3: Manual Copy-Paste

Copy the SQL below and run it in your database:

```sql
-- Create a view that aggregates cost center data including children
-- This will show parent cost centers with totals that include all child assignments

-- First, create a view that gets direct assignments for each cost center
CREATE OR REPLACE VIEW public.cost_center_direct_summary AS
SELECT 
  cc.id AS cost_center_id,
  cc.name AS cost_center_name,
  cc.description,
  cc.color,
  cc.parent_id,
  cc.is_active,
  COUNT(DISTINCT eia.id) AS direct_assignments,
  COALESCE(SUM(eii.total_price), 0) AS direct_cost,
  MIN(ei.invoice_date) AS first_assignment_date,
  MAX(ei.invoice_date) AS last_assignment_date
FROM public.cost_centers cc
LEFT JOIN public.equipment_invoice_item_assignments eia 
  ON eia.cost_center_id = cc.id AND eia.assignment_type = 'cost_center'
LEFT JOIN public.equipment_invoice_items eii 
  ON eii.id = eia.invoice_item_id
LEFT JOIN public.equipment_invoices ei 
  ON ei.id = eii.invoice_id
WHERE cc.is_active = true
GROUP BY cc.id, cc.name, cc.description, cc.color, cc.parent_id, cc.is_active;

-- Now create the hierarchical summary that includes children
CREATE OR REPLACE VIEW public.cost_center_summary_with_children AS
WITH RECURSIVE cost_center_hierarchy AS (
  -- Base case: all cost centers with their direct values
  SELECT 
    id,
    parent_id,
    id as root_id,
    direct_assignments,
    direct_cost
  FROM public.cost_center_direct_summary
  
  UNION ALL
  
  -- Recursive case: get children and roll up to parents
  SELECT 
    cch.parent_id as id,
    parent.parent_id,
    cch.root_id,
    cch.direct_assignments,
    cch.direct_cost
  FROM cost_center_hierarchy cch
  INNER JOIN public.cost_centers parent ON parent.id = cch.parent_id
  WHERE cch.parent_id IS NOT NULL
),
aggregated_totals AS (
  SELECT 
    id as cost_center_id,
    SUM(direct_assignments) as total_assignments,
    SUM(direct_cost) as total_cost
  FROM cost_center_hierarchy
  GROUP BY id
)
SELECT 
  cds.cost_center_id,
  cds.cost_center_name,
  cds.description,
  cds.color,
  cds.parent_id,
  cds.is_active,
  COALESCE(at.total_assignments, cds.direct_assignments) as total_assignments,
  COALESCE(at.total_cost, cds.direct_cost) as total_cost,
  cds.first_assignment_date,
  cds.last_assignment_date
FROM public.cost_center_direct_summary cds
LEFT JOIN aggregated_totals at ON at.cost_center_id = cds.cost_center_id
ORDER BY cds.cost_center_name;

-- Update the main cost_center_summary view to use hierarchical totals
DROP VIEW IF EXISTS public.cost_center_summary;

CREATE OR REPLACE VIEW public.cost_center_summary AS
SELECT * FROM public.cost_center_summary_with_children;

-- Grant permissions
GRANT SELECT ON public.cost_center_direct_summary TO authenticated;
GRANT SELECT ON public.cost_center_direct_summary TO service_role;
GRANT SELECT ON public.cost_center_summary_with_children TO authenticated;
GRANT SELECT ON public.cost_center_summary_with_children TO service_role;
GRANT SELECT ON public.cost_center_summary TO authenticated;
GRANT SELECT ON public.cost_center_summary TO service_role;
```

## Verification

After applying the migration, verify it works:

```sql
-- Quick check - parent totals should now include children
SELECT 
  cost_center_name,
  parent_id,
  total_assignments,
  ROUND(total_cost::numeric, 2) as total_cost_eur
FROM cost_center_summary
ORDER BY cost_center_name;
```

You should now see parent cost centers with their aggregated totals including all children.

For detailed testing, run the queries in `test-cost-center-hierarchy.sql`.

## Frontend Changes

The frontend has also been updated in `src/components/technika/CostCentersManagement.tsx`:

- When you click "Produktai" on a parent cost center, it now shows ALL products from both the parent AND all its children
- Child cost centers still show only their own products when expanded individually

This gives you a complete view of all expenses under a parent cost center hierarchy!
