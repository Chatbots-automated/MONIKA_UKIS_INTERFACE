# Fix Tool Movements Foreign Key Error

## Problem
When trying to checkout or return tools, you get this error:
```
insert or update on table "tool_movements" violates foreign key constraint "tool_movements_recorded_by_fkey"
Error: Key is not present in table "users"
```

## What We Found
I checked your database and found:
- **6 users exist** in the `public.users` table:
  - oksiuke30@gmail.com (Oksana Golienė) - tech
  - bartulis1234@gmail.com (Ramutis Bartulis) - vet
  - veterinaras@inbox.lt (Artūras Abromaitis) - admin
  - kkamille.11@gmail.com (Kamilė Vaitkutė) - vet
  - martynad936@gmail.com (Martyna) - vet
  - gratasgedraitis@gmail.com (Gratas Gedraitis) - admin

- **Recent tool movements work** - The last 5 movements all have valid `recorded_by` user IDs

## The Issue
The error happens because:
1. Your browser session has a user ID stored
2. That user ID doesn't exist in the `public.users` table (maybe it's stale or invalid)
3. The foreign key constraint rejects the insert because it can't find that user ID

## Solution

### Step 1: Fix the Database Constraints
Run this SQL in Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Copy the contents of `fix-tool-movements-constraints.sql`
3. Paste and click "Run"

This will make the foreign key constraints more forgiving (they'll accept NULL values instead of throwing errors).

### Step 2: Clear Your Browser Session
After applying the SQL fix:
1. In the app, click **Sign Out**
2. **Sign in again** with your email
3. Try checking out a tool again

This will refresh your user session with the correct user ID from the database.

### Step 3: Check the Console (Debug Info)
If it still doesn't work after Steps 1 and 2:
1. Open browser console (F12)
2. Try to checkout a tool
3. Look for these debug messages:
   ```
   Current user: {id: "...", email: "..."}
   User ID being passed: "..."
   ```
4. Share those with me - it will tell us if your user ID matches what's in the database

## What Changed in Code
I added debug logging to `ToolsManagement.tsx` so we can see exactly what user ID is being passed when you try to checkout or return tools.

## If the Issue Persists
If the error still happens after following these steps, it means:
- Your user email might not be in the list above
- You might need to be added to the `public.users` table
- There might be a sync issue between your auth session and the users table

Let me know which email you're logged in with and I can help add it to the users table if needed.
