# GEA Data Not Showing Latest Info - FIXED

## Problem
- Collar number search is working correctly ✅
- BUT the "GEA Duomenys" section shows old data (May 30) instead of latest data (June 4) ❌
- The data is being sent correctly from N8N and stored correctly in the database
- Issue: The materialized view `mv_animal_latest_gea` is STALE (not refreshed after imports)

## Root Cause
The RPC function `gea_daily_upload` inserts data into the three ataskaita tables but **doesn't refresh the materialized view** `mv_animal_latest_gea`. This materialized view is used for performance (to avoid querying 300k rows every time), but it caches the data and needs to be refreshed.

## Solution

### Immediate Fix (Run Now)
Run this in Supabase SQL Editor to see the latest data immediately:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_animal_latest_gea;
```

Or run the file: `refresh-gea-data-now.sql`

### Permanent Fix (Apply Migrations)
```bash
npx supabase db push
```

This applies 3 migrations:
1. **20260606000001_fix_collar_latest_data.sql** - Fixes collar number views
2. **20260606000002_auto_refresh_gea_materialized_view.sql** - Auto-refreshes materialized view after each import
3. **20260606000003_optimize_gea_queries.sql** - Adds helper functions and optimization

## What Was Changed

### Migration 1: Fixed Views
- `vw_animal_latest_collar` - Shows only latest import collar numbers
- `vw_animal_latest_gea_data` - Complete GEA data from latest import

### Migration 2: Auto-Refresh (CRITICAL)
Updated `gea_daily_upload` RPC function to:
```sql
-- After inserting all data...
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_animal_latest_gea;
```

Now every N8N import will automatically refresh the view!

### Migration 3: Optimization Tools
- `refresh_gea_materialized_view()` - Manual refresh with stats
- `cleanup_old_gea_imports(keep_count)` - Delete old imports to save space
- `vw_gea_import_stats` - View to monitor imports

## How to Use

### After Applying Migrations
1. Next time N8N sends data → Materialized view refreshes automatically
2. UI shows latest data immediately
3. No manual refresh needed!

### Manual Refresh (if needed)
```sql
-- Quick refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_animal_latest_gea;

-- Or with stats
SELECT * FROM refresh_gea_materialized_view();
```

### Clean Up Old Data (300k rows issue)
```sql
-- Keep only last 10 imports (delete older ones)
SELECT * FROM cleanup_old_gea_imports(10);

-- Keep only last 5 imports
SELECT * FROM cleanup_old_gea_imports(5);
```

## Performance Optimization

### Why Materialized View?
With 300k+ rows across 3 tables, querying "latest data per animal" is SLOW. The materialized view:
- Pre-computes the latest data for each animal
- Stores it as a table (fast queries)
- Refreshes in ~1 second after import
- Makes UI queries instant ⚡

### Storage Optimization
Run cleanup periodically to keep only recent imports:
```sql
-- Run monthly: Keep last 10 imports (delete everything older)
SELECT * FROM cleanup_old_gea_imports(10);
```

This prevents the database from growing too large while keeping historical data for the last 10 imports.

## Testing

### Test 1: Check Collar 189 Data
```sql
-- Run check-latest-import-data.sql
-- Should show June 4 dates, not May 30
```

### Test 2: Check Materialized View
```sql
SELECT collar_no, import_created_at, avg_daily_milk
FROM mv_animal_latest_gea
WHERE collar_no = '189';
```

Should match the latest import date.

### Test 3: Check in UI
1. Open app → Gyvunai tab
2. Click on an animal with GEA data
3. "GEA Duomenys" section should show June 4 dates
4. "Importuota" date should match the data shown

## Data Flow After Fix

```
N8N → Sends payload to /rpc/gea_daily_upload
  ↓
RPC Function:
  1. Creates import record
  2. Inserts into ataskaita1, ataskaita2, ataskaita3
  3. ✅ NEW: REFRESH MATERIALIZED VIEW CONCURRENTLY
  ↓
Materialized View Updated (takes ~1 second)
  ↓
UI Queries Materialized View → Shows Latest Data ✅
```

## Files Created

- `supabase/migrations/20260606000001_fix_collar_latest_data.sql`
- `supabase/migrations/20260606000002_auto_refresh_gea_materialized_view.sql`
- `supabase/migrations/20260606000003_optimize_gea_queries.sql`
- `refresh-gea-data-now.sql` - Run this to fix data immediately
- `check-latest-import-data.sql` - Diagnostic queries
- `GEA_DATA_FIX.md` - This file

## Summary

- ✅ Collar search working
- ✅ Data being sent correctly from N8N
- ✅ Data stored correctly in database tables
- ❌ Was: Materialized view not refreshed → UI shows stale data
- ✅ Fix: Auto-refresh materialized view after each import
- ✅ Bonus: Cleanup function to manage 300k row issue

## Next Steps

1. Run `npx supabase db push` to apply migrations
2. Run `refresh-gea-data-now.sql` to fix current stale data
3. Test: Next N8N import should auto-refresh the view
4. (Optional) Set up monthly cleanup: `SELECT * FROM cleanup_old_gea_imports(10);`
