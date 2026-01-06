# Apply Milk Weight Events Tracking Migration

## Purpose
Update the milk_weights table to track EVERY webhook event instead of just the latest one. This allows us to see the full history including milk accumulation (RECOVERY events) and unloading (ALERT events).

## Changes
1. Remove UNIQUE constraint to allow multiple events per session
2. Add event_type column to track event types (RECOVERY, ALERT, etc.)
3. Update the upsert function to INSERT every event
4. Add index for better performance
5. Frontend will show the maximum weight per session (peak before unloading)

## Instructions

1. Open the Supabase SQL Editor:
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new

2. Copy and paste the entire contents of `track-all-milk-events.sql`

3. Click "Run" to execute the migration

4. Verify the changes by checking that:
   - The unique constraint is removed
   - The event_type column exists
   - New webhook events create new rows instead of updating existing ones

## What This Fixes

Before: Only the last measurement was saved, so if milk was unloaded (weight goes to -2), that's what was stored.

After: Every event is saved, allowing us to track:
- RECOVERY events showing milk accumulation (e.g., 11241 kg)
- ALERT events showing milk unloaded (e.g., -2 kg after selling)
- Complete history of each milking session

The frontend now aggregates events to show the maximum weight per session (the actual milk amount before unloading).
