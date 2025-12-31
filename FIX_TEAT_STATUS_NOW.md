# FIX TEAT STATUS - APPLY IMMEDIATELY

## Problem Found
The teat_status table has RLS policies that require Supabase's built-in authentication (`TO authenticated`), but your app uses custom authentication. This is why the teats aren't being saved.

## Solution
Run the SQL fix to update the RLS policies.

## How to Apply

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `fix-teat-status-rls.sql`
5. Click "Run" or press Ctrl+Enter
6. You should see "Success. No rows returned" for each policy

### Option 2: Command Line (if you have database access)
```bash
# If you have direct database access via connection string
psql "YOUR_DATABASE_CONNECTION_STRING" < fix-teat-status-rls.sql
```

## What This Does
- Removes the old policies that check for `auth.uid()` (which is always NULL with custom auth)
- Creates new policies that allow the anon role (used by your app) to perform all operations
- Keeps RLS enabled for security

## After Applying
1. Refresh your app
2. Try creating a treatment for LT11111 again
3. Select K1 and D2 as "Išjungta"
4. Save the treatment
5. Go to "Apžvalga" tab - you should now see the disabled teats!

## The SQL File
The fix is in: `fix-teat-status-rls.sql`
