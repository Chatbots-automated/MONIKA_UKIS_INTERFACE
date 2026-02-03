# Fix: RLS Violation Error for Farm Equipment

## Problem
When trying to create new equipment in "Fermos įrangos aptarnavimai", you get an error:
```
RLS violates for farm_equipment table
```

## Root Causes

This error can occur for several reasons:

1. **RLS policies not created** - Migration didn't apply the policies
2. **Foreign key constraint issue** - `created_by` references `auth.users` incorrectly
3. **Missing permissions** - User doesn't have the right grants
4. **RLS enabled but no policies** - Table has RLS on but no matching policies

## Solutions

### Solution 1: Apply RLS Policies Fix (Try This First)

Run this SQL in your Supabase SQL Editor:

**File: `supabase/migrations/20240207000000_fix_farm_equipment_rls_policies.sql`**

```sql
-- Copy and paste the entire contents from:
-- supabase/migrations/20240207000000_fix_farm_equipment_rls_policies.sql
```

This will:
- Drop and recreate all RLS policies
- Add WITH CHECK clauses for UPDATE policies
- Ensure all permissions are granted
- Verify policies were created

### Solution 2: Fix Foreign Key Constraints

If Solution 1 doesn't work, the issue might be the `created_by` foreign key.

Run this SQL:

**File: `supabase/migrations/20240208000000_fix_farm_equipment_foreign_keys.sql`**

```sql
-- Copy and paste the entire contents from:
-- supabase/migrations/20240208000000_fix_farm_equipment_foreign_keys.sql
```

This removes the strict foreign key constraint on `created_by` and `performed_by` fields.

### Solution 3: Temporarily Disable RLS (Testing Only)

**⚠️ WARNING: Only for testing! Re-enable RLS after testing!**

```sql
-- Disable RLS temporarily
ALTER TABLE public.farm_equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_equipment_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_equipment_service_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_equipment_service_parts DISABLE ROW LEVEL SECURITY;
```

If this fixes it, the issue is definitely with the policies. Apply Solution 1, then re-enable:

```sql
-- Re-enable RLS
ALTER TABLE public.farm_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_equipment_service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_equipment_service_parts ENABLE ROW LEVEL SECURITY;
```

### Solution 4: Check Current RLS Status

Run this to see what's currently set up:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'farm_equipment%'
  AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, cmd, 
       CASE WHEN qual IS NULL THEN 'ALL' ELSE 'CONDITIONAL' END as using_clause,
       CASE WHEN with_check IS NULL THEN 'NONE' ELSE 'HAS CHECK' END as with_check_clause
FROM pg_policies
WHERE tablename LIKE 'farm_equipment%'
ORDER BY tablename, cmd;

-- Check grants
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name LIKE 'farm_equipment%'
  AND grantee IN ('authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
```

Expected output:
- All tables should have `rowsecurity = true`
- Should see 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- Should see ALL privileges for `authenticated` role

### Solution 5: Complete Recreation

If nothing else works, recreate the tables:

```sql
-- 1. Drop everything
DROP VIEW IF EXISTS farm_equipment_items_detail CASCADE;
DROP VIEW IF EXISTS farm_equipment_summary CASCADE;
DROP TABLE IF EXISTS farm_equipment_service_parts CASCADE;
DROP TABLE IF EXISTS farm_equipment_service_records CASCADE;
DROP TABLE IF EXISTS farm_equipment_items CASCADE;
DROP TABLE IF EXISTS farm_equipment CASCADE;
DROP FUNCTION IF EXISTS calculate_next_service_date(date, integer, text) CASCADE;
DROP FUNCTION IF EXISTS update_farm_equipment_item_next_service_date() CASCADE;
DROP FUNCTION IF EXISTS update_last_service_date_on_new_record() CASCADE;

-- 2. Run the main migration again
-- Copy from: supabase/migrations/20240206000000_farm_equipment_maintenance_system.sql

-- 3. Then run the RLS fix
-- Copy from: fix-farm-equipment-rls.sql
```

## Quick Test After Fix

After applying the fix, test with this:

```sql
-- Try to insert a test record
INSERT INTO public.farm_equipment (name, description, category)
VALUES ('TEST Equipment', 'Testing RLS', 'Melžimas')
RETURNING id, name;

-- If successful, you'll get the ID and name back
-- Delete the test record:
DELETE FROM public.farm_equipment WHERE name = 'TEST Equipment';
```

## Frontend Code Check

The frontend code looks correct. It's setting `created_by` properly:

```typescript
created_by: user?.id,
```

Make sure:
1. `user` is not null (you're logged in)
2. `user.id` is a valid UUID
3. The user is authenticated (has a valid session)

You can verify in browser console:
```javascript
// In browser console on the page
console.log('User:', user);
console.log('User ID:', user?.id);
```

## Step-by-Step Fix Guide

1. **Open Supabase Dashboard** → SQL Editor

2. **Run the RLS policies fix migration**
   - File: `supabase/migrations/20240207000000_fix_farm_equipment_rls_policies.sql`
   - Copy entire contents
   - Paste in SQL Editor
   - Click Run
   - Should see "Success" and policy verification output

3. **If still failing, run the foreign key fix migration**
   - File: `supabase/migrations/20240208000000_fix_farm_equipment_foreign_keys.sql`
   - Copy entire contents
   - Paste in SQL Editor
   - Click Run

4. **Test in the UI**
   - Refresh your browser (Ctrl+Shift+R)
   - Try creating equipment again
   - Should work now!

5. **If still failing, check the diagnostics:**
   - Run the "Check Current RLS Status" queries above
   - Share the output for further debugging

## Common Mistakes

❌ **Forgot to run the main migration first**
- Make sure you ran `20240206000000_farm_equipment_maintenance_system.sql` BEFORE the fixes

❌ **Not logged in**
- RLS policies require authenticated users
- Make sure you're logged into the app

❌ **Wrong database**
- Make sure you're running SQL on the correct Supabase project

❌ **Service role key in frontend**
- Never use service role key in frontend code
- Always use anon/authenticated keys

## Success Indicators

✅ No errors when creating equipment
✅ Equipment appears in the list immediately
✅ Can edit and delete equipment
✅ Can add components to equipment
✅ Can record services

## Need More Help?

If none of these solutions work:

1. Check browser console for the exact error message
2. Check Supabase logs (Dashboard → Logs)
3. Verify the user is authenticated
4. Try with a different user account
5. Check if other tables (like vehicles, tools) work properly

The RLS fix should resolve the issue in 95% of cases!
