# Fix for Visit Completion Error

## Problem
When trying to complete visits (uzbaigti), you get this error:
```
relation "stock_level" does not exist
```

## Root Cause
The database migration `20251118120000_course_medication_deduction_on_completion.sql` incorrectly references a non-existent `stock_level` table. The system actually uses the `batches` table for inventory tracking.

## Solution
Run the SQL fix that replaces the function to use the correct `batches` table.

---

## Option 1: Run Manually in Supabase Dashboard (RECOMMENDED)

This is the easiest and most reliable method:

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor

2. Click "New Query"

3. Copy the entire contents of the file: `fix_visit_medications.sql`

4. Paste into the SQL Editor

5. Click "Run" (or press Cmd/Ctrl + Enter)

6. You should see success messages in the output

✅ Done! Now try completing a visit again.

---

## Option 2: Run via Command Line

If you have your database password, you can run:

```bash
DB_PASSWORD=your_password_here node apply_visit_fix_pg.js
```

To get your database password:
1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/settings/database
2. Find "Database Password" section
3. Copy your password

---

## What the Fix Does

The fix:
1. Drops the old `process_visit_medications()` function that references `stock_level`
2. Creates a new version that correctly uses the `batches` table
3. Updates `batches.received_qty` to deduct inventory (instead of `stock_level.quantity`)
4. Keeps all other logic intact (planned medications, processing flags, treatment creation)

## After Applying the Fix

Once applied, the system will:
- ✅ Process visit medications without errors
- ✅ Correctly deduct inventory from batches when visits are completed
- ✅ Create treatment records automatically
- ✅ Prevent double-deduction with the `medications_processed` flag

---

## Verification

After applying the fix, test by:
1. Creating a visit with planned medications
2. Completing the visit (status = "Baigtas")
3. Check that inventory is deducted from the batch
4. Verify no errors appear

---

## Files Involved

- `fix_visit_medications.sql` - The SQL fix to apply
- `apply_visit_fix_pg.js` - Script to apply fix via command line (optional)
- This README file

---

## Need Help?

If you encounter any issues:
1. Make sure you're logged into Supabase Dashboard
2. Check that you have the correct project selected
3. Verify the SQL runs without syntax errors
4. Check the Supabase logs for any error messages
