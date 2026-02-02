# Fix Tool Movements Foreign Key Errors

## Problem
When trying to checkout or return tools (Įrankiai tab), the following error occurs:
```
insert or update on table "tool_movements" violates foreign key constraint "tool_movements_recorded_by_fkey"
Error: Key is not present in table "users"
```

This happens even when the user is authenticated and logged in.

## Root Cause
The error "Key is not present in table 'users'" means the user ID being passed doesn't exist in the `public.users` table. This could happen if:
1. The user session has an invalid or stale user ID
2. The user was created in Supabase Auth (`auth.users`) but not synced to `public.users`
3. There's a mismatch between the stored user ID and the database records

## Fixes Applied

### 1. Code Changes (Already Applied)
- Added debug logging to `ToolsManagement.tsx` to track what user IDs are being passed
- Updated to use `user?.id || null` to ensure null is passed when no user exists
- The console will now show detailed information about the user and IDs being used

### 2. Database Fix (Manual Step Required)

**Run this command to fix the foreign key constraints:**
```bash
node fix-foreign-keys-direct.cjs
```

This script will:
- Drop and recreate `tool_movements_recorded_by_fkey` with `ON DELETE SET NULL`
- Drop and recreate `tool_movements_to_holder_fkey` with `ON DELETE SET NULL`
- Drop and recreate `tool_movements_from_holder_fkey` with `ON DELETE SET NULL`
- Verify the `vehicles_created_by_fkey` constraint

**Note:** You need to add `DATABASE_URL` to your `.env` file:
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Get this from Supabase Dashboard → Project Settings → Database → Connection String (URI)

## Debugging Steps

### 1. Check the Browser Console
After building and deploying, try to checkout a tool and check the browser console. You should see:
```
Current user: {id: "...", email: "...", role: "..."}
User ID being passed: "..."
Checkout form holder_id: "..."
Inserting tool_movement: {...}
```

This will tell us what user ID is being used and if it matches what's in the database.

### 2. Check Database Users
Run this to verify users in the database:
```bash
node check-user-id.cjs
```

This will show:
- All users in `public.users` table
- Foreign key constraints and their settings
- Recent tool movements

## Expected Solution

After running the fix script, the foreign key constraints will allow NULL values and properly handle cases where:
- User is not logged in (NULL is allowed)
- User is logged in but ID doesn't match (SET NULL on delete)

If the error persists after applying the database fix, the debug logging will help us identify if the issue is with:
- The user ID being passed (check console logs)
- The users table not having the correct records
- A sync issue between auth and the users table
