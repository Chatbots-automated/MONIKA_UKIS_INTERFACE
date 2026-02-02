# Fix Public Access Foreign Key Errors

## Problem
When accessing the app from a public URL (without authentication), the following errors occurred:
1. `insert or update on table "vehicles" violates foreign key constraint "vehicles_created_by_fkey"`
2. `insert or update on table "tool_movements" violates foreign key constraint "tool_movements_recorded_by_fkey"`

## Root Cause
The code was passing `undefined` for `recorded_by` field when no user was authenticated, but the database foreign key constraints require either a valid user ID or explicitly `null`.

## Fixes Applied

### 1. Code Changes (Already Applied)
Fixed `ToolsManagement.tsx` to use `user?.id || null` instead of just `user?.id`:
- Line 184: `recorded_by: user?.id || null` (in checkout function)
- Line 282: `recorded_by: user?.id || null` (in return function)

### 2. Database Changes (Manual Step Required)
The database foreign key constraints need to be updated to properly handle NULL values with `ON DELETE SET NULL`.

**To apply the database fix, run:**
```bash
node fix-tool-movements-constraints.cjs
```

This will:
- Drop existing `tool_movements_recorded_by_fkey` constraint
- Recreate it with `ON DELETE SET NULL` to allow NULL values
- Do the same for `tool_movements_to_holder_fkey`

## Verification
After running the script:
1. Try accessing the Transportas tab from a public URL
2. Try accessing the Įrankiai tab from a public URL
3. Both should work without foreign key errors

## Technical Details
The foreign key constraints were pointing to `public.users` table but didn't have proper NULL handling. When accessing without authentication:
- `user?.id` returns `undefined` in JavaScript
- PostgreSQL foreign keys reject `undefined` but accept `null`
- Solution: Use `user?.id || null` to ensure `null` is passed when no user is authenticated
