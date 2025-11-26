# Fix for Visit Completion Error

## Problem
When trying to complete visits (uzbaigti), you get this error:
```
relation "stock_level" does not exist
```

## Root Cause
The database migration `20251118120000_course_medication_deduction_on_completion.sql` had multiple errors:
1. Referenced a non-existent `stock_level` table
2. Tried to update `batches.updated_at` column which doesn't exist
3. Attempted to directly modify `batches.received_qty` instead of using the view-based system

The system actually uses `usage_items` to track consumption, and a VIEW (`stock_by_batch`) automatically calculates: `on_hand = received_qty - SUM(usage_items.qty)`

## Solution
Run the SQL fix that only creates `usage_items` records. The inventory views will automatically calculate the correct remaining stock.

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
1. Drops the old `process_visit_medications()` function with errors
2. Creates a new version that ONLY creates `usage_items` records
3. No direct batch updates - inventory is calculated automatically by `stock_by_batch` view
4. Keeps all other logic intact (planned medications, processing flags, treatment creation)

## How It Works

When a visit is completed:
1. Function creates a `treatment` record (if needed)
2. Function creates `usage_items` records for each medication
3. The `stock_by_batch` VIEW automatically calculates: `on_hand = received_qty - SUM(usage_items.qty)`
4. No double-deduction possible because we only insert into `usage_items`

## After Applying the Fix

Once applied, the system will:
- ✅ Process visit medications without errors
- ✅ Correctly track medication usage via `usage_items`
- ✅ Inventory automatically reflects usage via views
- ✅ Create treatment records automatically
- ✅ Prevent double-deduction with the `medications_processed` flag

---

## Verification

After applying the fix, test by:
1. Creating a visit with planned medications
2. Completing the visit (status = "Baigtas")
3. Check that `usage_items` records are created
4. Verify the `stock_by_batch` view shows reduced inventory
5. Verify no errors appear

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
