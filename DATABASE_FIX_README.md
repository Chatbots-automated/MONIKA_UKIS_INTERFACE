# Database Fix Required - Unit Type Error

## Problem
When finishing visits (changing status to "Baigtas"), the system throws this error:
```
column unit is of type unit but expression is of type text
```

## Root Cause
The `process_visit_medications()` database function inserts medication units as TEXT strings, but the `usage_items.unit` column expects values of the `unit` ENUM type.

## Solution
The function needs to cast the unit value to the proper type using `::unit`.

## How to Apply the Fix

### Option 1: Run SQL in Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_unit_type.sql`
4. Click "Run" to execute

### Option 2: Use Supabase CLI (if available)
```bash
supabase db push
```

## What Was Changed
**Line 149 in the function:**
- **Before:** `COALESCE(v_medication->>'unit', 'ml'),`
- **After:** `COALESCE(v_medication->>'unit', 'ml')::unit,`

This change casts the text value to the proper `unit` ENUM type that the database expects.

## Files Modified
1. `/tmp/cc-agent/59000172/project/supabase/migrations/20251118120000_course_medication_deduction_on_completion.sql` - Updated for future reference
2. `/tmp/cc-agent/59000172/project/fix_unit_type.sql` - Standalone SQL fix to apply now

## After Applying
Once you run the SQL fix in your database:
1. Visit completion should work without errors
2. Medications will be properly recorded
3. Stock levels will be correctly deducted

## Testing
Try finishing a visit with medications to verify the fix works:
1. Go to Vizitai tab
2. Select a visit with planned medications
3. Change status to "Baigtas"
4. Verify no errors appear
5. Check that medications were recorded in the treatment history
