# Database Fix - Visit Completion Error

## Quick Summary

**Problem:** Errors when completing visits (uzbaigti)
**Solution:** Run the SQL fix in Supabase Dashboard
**Time:** 2 minutes

---

## Step-by-Step Fix

### 1. Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor

### 2. Create New Query

Click the **"New Query"** button

### 3. Copy the SQL Fix

Open the file: `fix_visit_medications.sql`

Copy ALL contents (Ctrl+A, Ctrl+C)

### 4. Paste and Run

Paste into the SQL Editor (Ctrl+V)

Click **"Run"** button (or press Ctrl+Enter)

### 5. Verify Success

You should see messages like:
```
NOTICE: DROP FUNCTION
NOTICE: CREATE FUNCTION
NOTICE: DROP TRIGGER
NOTICE: CREATE TRIGGER
```

✅ **Done!** You can now complete visits without errors.

---

## What Was Wrong?

The original function had 3 errors:

1. **Referenced non-existent table** (`stock_level`)
   - System doesn't have this table

2. **Referenced non-existent column** (`batches.updated_at`)
   - Batches table doesn't have this column

3. **Wrong approach to inventory**
   - Tried to directly modify `batches.received_qty`
   - Should only create `usage_items` records

## How It Works Now

### Correct Flow:
1. Visit is completed → status = "Baigtas"
2. Function creates `treatment` record (if needed)
3. Function creates `usage_items` records for each medication
4. **Database VIEW** (`stock_by_batch`) automatically calculates:
   ```
   on_hand = received_qty - SUM(usage_items.qty)
   ```

### Benefits:
- ✅ No errors
- ✅ No double-deduction possible
- ✅ Inventory automatically accurate
- ✅ Medications only deducted when visit completed (not when planned)
- ✅ Clear audit trail via `usage_items`

---

Last Updated: November 26, 2024
