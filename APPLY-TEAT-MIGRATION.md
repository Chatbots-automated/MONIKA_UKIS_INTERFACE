# Apply Teat Tracking Migration

Please apply the migration file manually:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20251118000000_comprehensive_teat_tracking_system.sql`
4. Execute the SQL

Or use the Supabase CLI if available:
```bash
supabase db push
```

The migration will create:
- `teat_status` table for tracking disabled teats
- `affected_teats` and `sick_teats` columns on the `treatments` table
