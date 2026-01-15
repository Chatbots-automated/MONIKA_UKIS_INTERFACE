# Link Milk Tests to Milk Weights Migration

## Overview

This migration creates the relationship between **milk laboratory test results** (pieno laboratorijos tyrimai) and **milk weights** (dieniniai pieno svoriai), enabling you to correlate laboratory data with actual milk production weights.

## What This Migration Does

### 1. Schema Changes
- Adds `milk_weight_id` foreign key column to `milk_composition_tests` table
- Adds `milk_weight_id` foreign key column to `milk_quality_tests` table
- Creates indexes on both new columns for optimal query performance

### 2. Data Linking Function
Creates `link_past_milk_tests_to_weights()` function that:
- Links existing composition tests to milk weights
- Links existing quality tests to milk weights
- Matching logic: `test.paemimo_data = weight.date` AND `producer.label = weight.session_type`
- Only processes past dates (`paemimo_data <= CURRENT_DATE`)
- Returns counts of linked records

### 3. Automatic Linking System
Creates trigger function `auto_link_milk_test_to_weight()` that:
- Automatically links new test results when inserted
- Updates links when test records are modified
- Triggers installed on both `milk_composition_tests` and `milk_quality_tests` tables

### 4. Combined View
Creates `milk_data_combined` view that shows:
- Milk weight records with their linked test data
- Composition test results (fat %, protein %, lactose %, pH, etc.)
- Quality test results (somatic cell count, bacteria count)
- Producer information
- Ordered by date (most recent first)

## Linking Logic

The migration links test records to milk weights using these criteria:

```
Test Record Links to Weight When:
  test.paemimo_data = weight.date
  AND
  producer.label = weight.session_type
  AND
  test.paemimo_data <= CURRENT_DATE
```

Where:
- `paemimo_data` = Sample collection date from test
- `weight.date` = Date of milk weight measurement
- `producer.label` = "naktinis" (night) or "rytinis" (morning)
- `weight.session_type` = "naktinis" (night) or "rytinis" (morning)

## Files Created

1. **`link-milk-tests-to-weights-migration.sql`** - The migration SQL file
2. **`apply-milk-link-final.cjs`** - Script to check migration status and show statistics

## How to Apply

### Option 1: Supabase Dashboard (RECOMMENDED)

1. Open the SQL Editor:
   ```
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
   ```

2. Copy the entire contents of `link-milk-tests-to-weights-migration.sql`

3. Paste into the SQL editor

4. Click the "RUN" button

5. Wait for success messages in the output panel

### Option 2: Supabase CLI

```bash
# Install CLI if needed
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref olxnahsxvyiadknybagt

# Apply migrations
supabase db push
```

## Verification

After applying the migration, run the verification script:

```bash
node apply-milk-link-final.cjs
```

This will show:
- Number of composition tests linked
- Number of quality tests linked
- Total records processed
- Sample of linked data
- Link success rates

### Expected Output

```
📊 COMPOSITION TESTS
─────────────────────────────────────────────────────────────
   Total tests:        XXX
   Linked to weights:  XXX
   Not linked:         XXX
   Link rate:          XX.X%

📊 QUALITY TESTS
─────────────────────────────────────────────────────────────
   Total tests:        XXX
   Linked to weights:  XXX
   Not linked:         XXX
   Link rate:          XX.X%

📊 SUMMARY
─────────────────────────────────────────────────────────────
   Total test records linked:  XXX
   Total weight records:       XXX
   Unique dates with weights:  XXX
```

## Using the Combined View

After migration, you can query the combined view to get milk weights with test data:

```sql
-- Get recent milk data with tests
SELECT
  date,
  session_type,
  milk_weight_kg,
  fat_percentage,
  protein_percentage,
  lactose_percentage,
  somatic_cell_count,
  total_bacteria_count
FROM milk_data_combined
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Get averages by session type
SELECT
  session_type,
  AVG(milk_weight_kg) as avg_weight,
  AVG(fat_percentage) as avg_fat,
  AVG(protein_percentage) as avg_protein
FROM milk_data_combined
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  AND composition_test_id IS NOT NULL
GROUP BY session_type;
```

## Migration Safety Features

✅ **Idempotent** - Uses `IF NOT EXISTS` checks, safe to run multiple times
✅ **Non-destructive** - Only adds columns, never removes data
✅ **Error handling** - Functions include EXCEPTION handlers
✅ **Null-safe** - Foreign keys use `ON DELETE SET NULL`
✅ **Indexed** - Creates indexes for performance
✅ **RLS compliant** - View uses `security_invoker = true`

## Troubleshooting

### Migration doesn't link any records

Possible causes:
1. No matching dates between weights and tests
2. Producer labels don't match session types
3. Test dates are in the future

Check with:
```sql
-- Check for matching dates
SELECT DISTINCT w.date, w.session_type, p.label
FROM milk_weights w
CROSS JOIN milk_producers p
WHERE EXISTS (
  SELECT 1 FROM milk_composition_tests t
  WHERE t.producer_id = p.id
  AND t.paemimo_data = w.date
);
```

### Links not happening automatically

1. Check triggers are installed:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%auto_link%';
```

2. Verify trigger functions exist:
```sql
SELECT proname FROM pg_proc WHERE proname = 'auto_link_milk_test_to_weight';
```

### View returns empty results

1. Verify the view exists:
```sql
SELECT * FROM information_schema.views WHERE table_name = 'milk_data_combined';
```

2. Check if there are any linked records:
```sql
SELECT COUNT(*) FROM milk_composition_tests WHERE milk_weight_id IS NOT NULL;
SELECT COUNT(*) FROM milk_quality_tests WHERE milk_weight_id IS NOT NULL;
```

## Rollback (if needed)

To revert this migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_auto_link_composition_test ON milk_composition_tests;
DROP TRIGGER IF EXISTS trigger_auto_link_quality_test ON milk_quality_tests;

-- Drop trigger function
DROP FUNCTION IF EXISTS auto_link_milk_test_to_weight();

-- Drop linking function
DROP FUNCTION IF EXISTS link_past_milk_tests_to_weights();

-- Drop view
DROP VIEW IF EXISTS milk_data_combined;

-- Drop indexes
DROP INDEX IF EXISTS idx_milk_composition_tests_milk_weight_id;
DROP INDEX IF EXISTS idx_milk_quality_tests_milk_weight_id;

-- Remove columns
ALTER TABLE milk_composition_tests DROP COLUMN IF EXISTS milk_weight_id;
ALTER TABLE milk_quality_tests DROP COLUMN IF EXISTS milk_weight_id;
```

## Technical Details

### Database Objects Created

| Type | Name | Description |
|------|------|-------------|
| Column | `milk_composition_tests.milk_weight_id` | Foreign key to milk_weights |
| Column | `milk_quality_tests.milk_weight_id` | Foreign key to milk_weights |
| Index | `idx_milk_composition_tests_milk_weight_id` | Performance index |
| Index | `idx_milk_quality_tests_milk_weight_id` | Performance index |
| Function | `link_past_milk_tests_to_weights()` | Batch linking function |
| Function | `auto_link_milk_test_to_weight()` | Trigger function |
| Trigger | `trigger_auto_link_composition_test` | Auto-link on INSERT/UPDATE |
| Trigger | `trigger_auto_link_quality_test` | Auto-link on INSERT/UPDATE |
| View | `milk_data_combined` | Combined data view |

### Performance Considerations

- Indexes created on foreign key columns for fast JOINs
- View uses LEFT JOINs to include weights without tests
- Trigger function uses LIMIT 1 for safety
- Functions use SECURITY DEFINER for consistent permissions

## Support

If you encounter issues:
1. Run the verification script: `node apply-milk-link-final.cjs`
2. Check the troubleshooting section above
3. Review Supabase logs in the dashboard
4. Verify all prerequisite tables exist (milk_weights, milk_producers, milk_composition_tests, milk_quality_tests)

---

**Note**: The `mcp__supabase__apply_migration` tool mentioned in your request is not available in the current environment. This migration must be applied manually using one of the methods above.
