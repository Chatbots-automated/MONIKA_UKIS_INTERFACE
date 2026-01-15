# Milk Weights and Lab Tests Linking

## Overview
Created a database migration to link milk weights (dieniniai pieno svoriai) with laboratory test results (pieno laboratorijos tyrimai).

## What It Does
- Links composition tests (fat, protein, lactose, pH, etc.) to daily milk weights
- Links quality tests (somatic cells, bacteria count) to daily milk weights
- Matches by: date + session type (naktinis/rytinis)
- Only links past records (not future dates)
- Automatically links new test results as they come in

## Files Created

### Migration
- `supabase/migrations/20260116000000_link_milk_weights_to_tests.sql` - The database migration

### Verification Script
- `verify-milk-link.js` - Check if migration is applied and see statistics

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Open `supabase/migrations/20260116000000_link_milk_weights_to_tests.sql`
3. Copy all contents
4. Paste into SQL Editor
5. Click **RUN**

### Option 2: Supabase CLI
```bash
supabase db push
```

## Verify It Worked

Run the verification script:
```bash
node verify-milk-link.js
```

This will show:
- How many composition tests were linked
- How many quality tests were linked
- Success rates
- Sample combined data

## What Gets Created

### 1. New Columns
- `milk_composition_tests.milk_weight_id` → references `milk_weights`
- `milk_quality_tests.milk_weight_id` → references `milk_weights`

### 2. Linking Function
- `link_past_milk_tests_to_weights()` - Links existing data

### 3. Automatic Triggers
- Auto-links new test results when inserted/updated
- Only for past dates

### 4. Combined View
- `milk_data_combined` - Shows all data together:
  - Daily milk weights
  - Composition test results (fat %, protein %, lactose %, pH, urea)
  - Quality test results (somatic cells, bacteria)
  - Producer information

## Linking Logic

Tests are linked to weights when:
```
test.paemimo_data = weight.date
AND
producer.label = weight.session_type
AND
test.paemimo_data <= TODAY
```

Example:
- Test collected on 2026-01-07, producer label "naktinis"
- Matches weight with date 2026-01-07, session_type "naktinis"
- They get linked automatically

## Usage in Queries

```javascript
// Get milk weights with test data
const { data } = await supabase
  .from('milk_data_combined')
  .select('*')
  .order('date', { ascending: false });

// Get composition tests with weight info
const { data } = await supabase
  .from('milk_composition_tests')
  .select(`
    *,
    milk_weights(date, session_type, weight)
  `)
  .not('milk_weight_id', 'is', null);
```

## Safety Features
✅ Idempotent (safe to run multiple times)
✅ Non-destructive (only adds links, never removes data)
✅ Automatic (new tests auto-link)
✅ Past-only (won't link future dates)
✅ Indexed (fast queries)

## Next Steps
1. Apply the migration using one of the methods above
2. Run `node verify-milk-link.js` to confirm
3. Start using the `milk_data_combined` view in your app
