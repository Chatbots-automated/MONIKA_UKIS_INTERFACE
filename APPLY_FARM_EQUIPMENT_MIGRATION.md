# Apply Farm Equipment Maintenance Migration

## Quick Start

### 1. Apply Database Migration

**Go to Supabase Dashboard:**
1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Copy the SQL from `supabase/migrations/20240206000000_farm_equipment_maintenance_system.sql`
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl+Enter)

### 2. Verify Migration

Run this verification query:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'farm_equipment%'
ORDER BY table_name;

-- Should return:
-- farm_equipment
-- farm_equipment_items
-- farm_equipment_service_parts
-- farm_equipment_service_records
```

Check views:

```sql
-- Check views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'farm_equipment%'
ORDER BY table_name;

-- Should return:
-- farm_equipment_items_detail
-- farm_equipment_summary
```

### 3. Test with Sample Data (Optional)

```sql
-- Create a test equipment
INSERT INTO farm_equipment (name, description, category, location)
VALUES ('Test Karuselė', 'Bandomoji karuselė', 'Melžimas', 'Tvartas 1')
RETURNING id;

-- Use the returned ID in the next query (replace 'YOUR-ID-HERE')
INSERT INTO farm_equipment_items (
  farm_equipment_id, 
  item_name, 
  service_interval_value, 
  service_interval_type,
  last_service_date
)
VALUES (
  'YOUR-ID-HERE', 
  'Filtrai', 
  3, 
  'months',
  CURRENT_DATE - INTERVAL '2 months'
);

-- Check the summary view
SELECT * FROM farm_equipment_summary;

-- Check the items detail view
SELECT 
  equipment_name,
  item_name,
  last_service_date,
  next_service_date,
  days_until_service,
  service_status
FROM farm_equipment_items_detail;

-- Clean up test data
DELETE FROM farm_equipment WHERE name = 'Test Karuselė';
```

### 4. Access the UI

1. Refresh your browser
2. Navigate to **Technika** module
3. Look for **"Fermos įrangos aptarnavimai"** in the left sidebar
4. Click it to open the new maintenance system

## Troubleshooting

### Error: "relation already exists"
The tables might already exist. You can drop them first:

```sql
DROP VIEW IF EXISTS farm_equipment_items_detail CASCADE;
DROP VIEW IF EXISTS farm_equipment_summary CASCADE;
DROP TABLE IF EXISTS farm_equipment_service_parts CASCADE;
DROP TABLE IF EXISTS farm_equipment_service_records CASCADE;
DROP TABLE IF EXISTS farm_equipment_items CASCADE;
DROP TABLE IF EXISTS farm_equipment CASCADE;
DROP FUNCTION IF EXISTS calculate_next_service_date CASCADE;
DROP FUNCTION IF EXISTS update_farm_equipment_item_next_service_date CASCADE;
DROP FUNCTION IF EXISTS update_last_service_date_on_new_record CASCADE;
```

Then run the migration again.

### Error: "function update_updated_at_column does not exist"
This function should exist from previous migrations. If not, create it:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### UI Not Showing the New Tab
1. Hard refresh your browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for errors
4. Verify you're on the latest frontend code

### RLS Errors
If you get permission errors, verify RLS policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'farm_equipment%';

-- All should have rowsecurity = true

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE 'farm_equipment%';

-- Should see multiple policies for each table
```

## What's Next?

After migration is applied:

1. ✅ Create your first equipment (e.g., "Karuselė", "Melžimo sistema")
2. ✅ Add components to the equipment (e.g., "Filtrai", "Paklotas")
3. ✅ Set service intervals for each component
4. ✅ Record services as they're performed
5. 🔜 Later: Add reminders and parts tracking

## Complete Documentation

See `FARM_EQUIPMENT_MAINTENANCE_SYSTEM.md` for:
- Full system documentation
- Detailed feature descriptions
- Usage examples
- Future enhancements

---

**Ready to go!** Apply the migration and start tracking your farm equipment maintenance! 🚜
