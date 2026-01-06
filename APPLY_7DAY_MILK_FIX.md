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
- This is "averaging an average" which is mathematically incorrect
- `milk_avg` is already a pre-calculated average from the GEA system
- Results in inconsistent values across different sections

### Solution
- Calculate from **actual daily production** by summing all milkings per day
- Formula: `m1_qty + m2_qty + m3_qty + m4_qty + m5_qty`
- Use **7-day window** instead of 30 days for more accurate recent production
- Apply consistently to both synchronization and treatment milk loss calculations

### Impact
- Synchronization section will show accurate milk loss based on actual production
- Treatment section will show accurate milk loss based on actual production
- Both sections will now show **consistent** values
- Individual animal GEA tab remains unchanged (continues to show `milk_avg` field)

## After Applying

Run the test script to verify the fix:

```bash
node test-7day-milk-fix.js
```

This will show you the corrected calculations for animal LT000009135825.
