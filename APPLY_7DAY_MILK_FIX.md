# Apply 7-Day Milk Loss Calculation Fix

## Instructions

To apply the milk loss calculation fix, follow these steps:

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new

2. Copy the entire contents of `fix-milk-loss-7day-actual.sql`

3. Paste into the SQL editor

4. Click "Run"

## What This Fix Does

### Problem
- Current calculations use `AVG(milk_avg)` over 30 days
- Need shorter window for more accurate recent production tracking
- Results in inconsistent values across different sections

### Solution
- Use **milk_avg (Pieno vidurkis)** field from gea_daily
- Use **7-day window** instead of 30 days for more accurate recent production
- Apply consistently to both synchronization and treatment milk loss calculations

### Impact
- Synchronization section will use 7-day average of milk_avg (Pieno vidurkis)
- Treatment section will use 7-day average of milk_avg (Pieno vidurkis)
- Both sections will now show **consistent** values based on 7-day window
- More accurate tracking of recent milk production changes

## After Applying

Run the test script to verify the fix:

```bash
node test-7day-milk-fix.js
```

This will show you the corrected calculations for animal LT000009135825.
