# Quick Fixes to Apply

## Issue 1: SQL Migration Error (FIXED ✅)

**Error:** `column mwo.actual_cost does not exist`

**Fixed:** Changed `mwo.actual_cost` to `mwo.total_cost` in the migration file.

**To Apply:**
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Copy and paste the entire contents of `vehicle-service-visits-migration.sql`
3. Click "Run"

---

## Issue 2: Cost Centers Count Mismatch (NEEDS FIX)

**Problem:** Cost center shows "Produktų: 2" but only displays 1 item when expanded

**Root Cause:**
- The `cost_center_summary` view counts ALL assignments
- The `cost_center_parts_usage` view only shows assignments where `assignment_type = 'cost_center'`
- You have 2 total assignments, but only 1 has `assignment_type = 'cost_center'`

**Fix:**
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `fix-cost-center-summary-count.sql`
3. Click "Run"

This will update the summary view to only count `cost_center` type assignments, making the counts match the detail view.

---

## Summary

Both SQL files are ready to apply:

1. **`vehicle-service-visits-migration.sql`** - Creates vehicle service visit system
2. **`fix-cost-center-summary-count.sql`** - Fixes cost center count mismatch

Apply them in any order through your Supabase SQL Editor!
