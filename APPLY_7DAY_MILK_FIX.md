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
- This is "averaging an average" which is unnecessary
- The `milk_avg` (Pieno vidurkis) is already an average calculated by GEA
- Results in inconsistent values across different sections

### Solution
- Use **milk_avg (Pieno vidurkis)** field directly from gea_daily
- No additional averaging calculations needed
- Just get the latest milk_avg value for the animal
- Apply consistently to both synchronization and treatment milk loss calculations

### Impact
- Synchronization section will use milk_avg (Pieno vidurkis) directly
- Treatment section will use milk_avg (Pieno vidurkis) directly
- Both sections will now show **consistent** values
- Simpler and more accurate calculations

## After Applying

Run the test script to verify the fix:

```bash
node test-7day-milk-fix.js
```

This will show you the corrected calculations for animal LT000009135825.
