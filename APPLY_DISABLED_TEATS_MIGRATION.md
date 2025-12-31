# Apply Disabled Teats Migration

The `disabled_teats` column needs to be added to the `treatments` table in your Supabase database.

## Steps to Apply

1. Go to your Supabase project dashboard at: https://olxnahsxvyiadknybagt.supabase.co

2. Navigate to: **SQL Editor** (in the left sidebar)

3. Click "New Query"

4. Copy and paste this SQL:

```sql
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS disabled_teats text[];
COMMENT ON COLUMN treatments.disabled_teats IS 'Array of teat positions that were disabled during this treatment';
```

5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)

6. You should see a success message

## What This Does

This migration adds a new column `disabled_teats` to the `treatments` table that stores an array of teat positions (like `["k1", "d2"]`) that were marked as disabled during a treatment visit.

This allows the system to:
- Track which teats were disabled during each treatment
- Display disabled teats in treatment history
- Maintain complete teat status records

## After Running

Once the migration is applied, the "Išjungtas" (disabled) teat functionality will work correctly in the application.
