# Fix Milk Data RLS Policies

The milk test data is not showing because Row Level Security (RLS) policies are missing.

## Apply the Fix

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL below:

```sql
-- milk_producers policies
DROP POLICY IF EXISTS "Users can view milk producers" ON milk_producers;
DROP POLICY IF EXISTS "Users can insert milk producers" ON milk_producers;
DROP POLICY IF EXISTS "Users can update milk producers" ON milk_producers;

CREATE POLICY "Users can view milk producers"
  ON milk_producers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert milk producers"
  ON milk_producers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update milk producers"
  ON milk_producers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- milk_composition_tests policies
DROP POLICY IF EXISTS "Users can view composition tests" ON milk_composition_tests;
DROP POLICY IF EXISTS "Users can insert composition tests" ON milk_composition_tests;
DROP POLICY IF EXISTS "Users can update composition tests" ON milk_composition_tests;

CREATE POLICY "Users can view composition tests"
  ON milk_composition_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert composition tests"
  ON milk_composition_tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update composition tests"
  ON milk_composition_tests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- milk_quality_tests policies
DROP POLICY IF EXISTS "Users can view quality tests" ON milk_quality_tests;
DROP POLICY IF EXISTS "Users can insert quality tests" ON milk_quality_tests;
DROP POLICY IF EXISTS "Users can update quality tests" ON milk_quality_tests;

CREATE POLICY "Users can view quality tests"
  ON milk_quality_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert quality tests"
  ON milk_quality_tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update quality tests"
  ON milk_quality_tests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
6. You should see "Success. No rows returned"
7. Refresh your application

The milk test data will now be visible in the "Laboratorijos tyrimai" tab!
