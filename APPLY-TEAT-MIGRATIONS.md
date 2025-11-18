# Apply Teat Tracking Migrations

You need to apply 2 migration files to your Supabase database:

## Step 1: Apply the main teat tracking system migration

Open your Supabase Dashboard SQL Editor and run:
```
supabase/migrations/20251118000000_comprehensive_teat_tracking_system.sql
```

This creates:
- `teat_status` table for tracking disabled teats
- `sick_teats` and `affected_teats` columns on treatments table
- RLS policies

## Step 2: Update the analytics view

Run the second migration:
```
supabase/migrations/20251118100000_update_teat_analytics_view.sql
```

This updates:
- `vw_teat_treatment_analytics` view to use the new JSONB columns
- Properly tracks treatments by individual teats in analytics

## What This Enables

✅ Track sick teats during treatment
✅ Track permanently disabled teats per animal
✅ View teat status in animal overview
✅ See teat information in treatment and visit history
✅ Analytics showing which teats are treated most often
✅ Track new vs recurring cases per teat
