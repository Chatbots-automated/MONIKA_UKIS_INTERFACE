# URGENT: Fix Visit Cancellation Bug

## The Problem

The SQL function had a bug. It was updating the synchronization protocol status and steps, but the WHERE clause on the visits update was incorrect. The visits still show status 'Planuojamas' instead of 'Atšauktas'.

## The Fix

Run the SQL file **`fix_visit_fix.sql`** in your Supabase SQL Editor.

This will:
1. Fix the function with correct logic
2. Immediately fix the visits for animal LT000044225432  
3. Re-process ALL APSĖK animals to fix any others that may have the same issue

## After Running

The visits for LT000044225432 and all other APSĖK animals will be:
1. Updated to status "Atšauktas" (Cancelled) in the database
2. **Automatically hidden** from the Vizitai tab to avoid confusion
3. Still accessible if needed by viewing the database directly

The UI now automatically filters out cancelled visits so they don't show up in the visits list.
