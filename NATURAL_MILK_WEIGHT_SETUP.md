# Natural Milk Weight Calculation System

## Overview

This system calculates the "natural" milk weight based on the composition (fat% and protein%) of the milk. When milk is weighed on a scale, the actual nutritional value varies based on its composition. This system standardizes the weight based on baseline fat and protein percentages.

## Formula

**Natural Weight = Scale Weight × Recalculation Coefficient**

Where:
```
Coefficient = (0.4 × Fat% + 0.6 × Protein%) / (0.4 × 3.4 + 0.6 × 3.0)

Base fat = 3.4%
Base protein = 3.0%
```

### Example

If you have 10kg of milk with:
- Fat: 4.2%
- Protein: 3.8%

```
Coefficient = (0.4 × 4.2 + 0.6 × 3.8) / (0.4 × 3.4 + 0.6 × 3.0)
            = (1.68 + 2.28) / (1.36 + 1.8)
            = 3.96 / 3.16
            = 1.253

Natural weight = 10kg × 1.253 = 12.53kg
```

## Database Schema

### New Columns in `milk_production` table:

1. **scale_weight_kg** (decimal) - Raw weight from scale
2. **scale_timestamp_lt** (timestamptz) - Timestamp from scale in Europe/Vilnius timezone
3. **recalculation_coefficient** (decimal) - The calculated coefficient
4. **natural_weight_kg** (decimal) - The adjusted natural weight

## How It Works

1. **Scale sends weight data** to your N8N workflow with this format:
   ```json
   {
     "weight": 7606,
     "unit": "kg",
     "hose": "disconnected",
     "scale": {
       "status": "ST",
       "stable": true
     },
     "timestamp_lt": "2026-01-04 18:02:18",
     "tz": "Europe/Vilnius"
   }
   ```

2. **Data is stored** in `milk_production` table with `scale_weight_kg` and `scale_timestamp_lt`

3. **Automatic calculation** happens via database triggers:
   - When scale weight is inserted/updated
   - When composition test data (fat%, protein%) is added/updated

4. **Natural weight** is calculated and stored in `natural_weight_kg` column

## Installation

### Step 1: Apply the Migration

Run the SQL migration in Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file `natural-milk-weight-migration.sql`
4. Copy and paste the entire content
5. Click "Run"

### Step 2: Verify Installation

After running the migration, verify the columns were created:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'milk_production'
  AND column_name IN ('scale_weight_kg', 'scale_timestamp_lt', 'recalculation_coefficient', 'natural_weight_kg');
```

You should see all 4 new columns.

## Usage

### Inserting Scale Data

When N8N receives weight from the scale, insert it like this:

```javascript
const { data, error } = await supabase
  .from('milk_production')
  .insert({
    producer_id: 'uuid-here',
    konteineris: 'container-id',
    production_date: '2026-01-04',
    scale_weight_kg: 7606,
    scale_timestamp_lt: '2026-01-04 18:02:18'
  });
```

### Automatic Calculation

The natural weight will be calculated automatically if:
- Composition test data exists for the same `konteineris` and `production_date`
- The composition test has both `riebalu_kiekis` (fat%) and `baltymu_kiekis` (protein%)

### Manual Recalculation

If you need to manually recalculate for a specific production record:

```sql
SELECT calculate_natural_milk_weight('production-id-uuid');
```

### Querying Data

Get production data with natural weights:

```sql
SELECT
  production_date,
  konteineris,
  scale_weight_kg,
  recalculation_coefficient,
  natural_weight_kg,
  (natural_weight_kg - scale_weight_kg) as weight_difference
FROM milk_production
WHERE natural_weight_kg IS NOT NULL
ORDER BY production_date DESC;
```

## Analytics View

The `milk_producer_analytics` view has been updated to include:

- `last_scale_weight_kg` - Last raw weight from scale
- `last_natural_weight_kg` - Last calculated natural weight
- `last_coefficient` - Last recalculation coefficient
- `total_natural_kg_produced` - Total natural weight across all deliveries
- `avg_natural_kg_per_delivery` - Average natural weight per delivery

## Important Notes

1. **Backward Compatibility**: The existing `weight_kg` column is kept for backward compatibility
2. **NULL Values**: If no composition data exists, `natural_weight_kg` will be `NULL`
3. **Payment Calculations**: The payment estimation now uses natural weight instead of raw weight
4. **Automatic Updates**: When composition tests are updated, all matching production records are recalculated

## Next Steps

1. Apply the migration (see Installation above)
2. Configure your N8N workflow to send scale data to Supabase
3. Test with sample data
4. Monitor the automatic calculations
