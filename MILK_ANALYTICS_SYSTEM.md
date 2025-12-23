# Milk Production Analytics System

## Overview
Comprehensive milk production tracking and analytics system with scale integration support.

## Database Schema

### Data Storage Notes
**CRITICAL**: Quality metric values are stored in thousands (k):
- `somatiniu_lasteliu_skaicius = 197` means 197,000 cells/ml (197k)
- `bendras_bakteriju_skaicius = 141` means 141,000 bacteria/ml (141k)

This matches the lab report format: "Somatinių ląstelių skaičius, tūkst./ml"

### milk_production table
Stores actual production weights from farm scales:
- `producer_id` - links to milk_producers
- `konteineris` - container ID (links scale to lab tests)
- `production_date` - collection date
- `weight_kg` - actual weight from scale in kilograms
- `temperature_c` - optional milk temperature

### milk_producer_analytics view
Comprehensive analytics per producer:
- Production statistics (total kg, deliveries, averages)
- Latest composition (fat%, protein%, lactose%)
- Quality metrics (SCC, bacteria with 30-day trends)
- Payment estimates

## Container Linking (konteineris)

The `konteineris` field links:
1. Scale measurements (`milk_production`)
2. Lab composition tests (`milk_composition_tests`)
3. Lab quality tests (`milk_quality_tests`)

Example: Container "U0483360"
- Scale records: 450.5 kg on 2025-12-18
- Lab tests same container on 2025-12-19
- Analytics join by konteineris for complete picture

## Payment Calculation

Function: `calculate_milk_payment(weight_kg, fat%, protein%, scc_k, bacteria_k)`

**Base Price**: 0.45 EUR/kg

**Quality Adjustments** (values in thousands):
```
SCC < 200k:     +5%  (Puiki)
SCC 200-400k:    0%  (Gera)
SCC 400-600k:   -5%  (Vidutinė)
SCC > 600k:    -15%  (Bloga)

Bacteria < 100k:  +2%
Bacteria > 300k:  -5%
```

**Composition Bonuses**:
```
Fat > 3.5%:     +0.01 EUR per 0.1% excess
Protein > 3.2%: +0.015 EUR per 0.1% excess
```

**Example** (450 kg, Fat 4.6%, Protein 3.4%, SCC 141k, Bacteria 162k):
```
Base:          450 × 0.45 = 202.50 EUR
Quality (SCC): 202.50 × 1.05 = +10.13 EUR
Quality (Bac): No change (100-300k range)
Fat bonus:     (4.6-3.5) × 0.1 × 450 = +4.95 EUR
Protein bonus: (3.4-3.2) × 0.15 × 450 = +13.50 EUR
-----------------------------------------
Total:         231.08 EUR
```

## Scale Integration Options

### Option A: Direct Database Insert
```typescript
// From scale software to Supabase REST API
POST https://your-project.supabase.co/rest/v1/milk_production
Authorization: Bearer YOUR_SERVICE_KEY
{
  "producer_id": "uuid-here",
  "konteineris": "U0483360",
  "production_date": "2025-12-23",
  "weight_kg": 450.5,
  "temperature_c": 4.2
}
```

### Option B: n8n Workflow
1. Scale exports to file/API endpoint
2. n8n reads and parses scale data
3. n8n inserts into Supabase
4. Extends existing milk data import workflow

### Option C: Edge Function
Create endpoint to receive scale data:
```typescript
// POST /functions/v1/record-milk-weight
{
  "producer_code": "41982-1",
  "container": "U0483360",
  "weight_kg": 450.5,
  "temperature_c": 4.2
}
```

## Frontend Components

### Pienas Component
Main interface with two tabs:
1. **Tyrimų duomenys** - Raw lab test data with expandable details
2. **Analitika** - Comprehensive analytics dashboard

### PienasAnalytics Component
Features:
- Producer selector dropdown
- Overview cards:
  - Total production with quality badge
  - Latest delivery weight and date
  - Current SCC with trend arrow
  - Estimated payment
- Composition breakdown:
  - Fat%, protein%, lactose% with progress bars
  - 30-day averages and standard deviation
  - Trend indicators (↑ improving, ↓ worsening, — stable)
- Quality metrics:
  - SCC: current, 30d avg, min, max
  - Bacteria count with trends
  - Temperature from last delivery
- Payment calculator breakdown

## Migration Files

### 20251223000000_create_milk_test_system.sql
Creates core tables for lab test data

### 20251223130000_create_milk_production_analytics.sql
Creates:
- `milk_production` table
- `calculate_milk_payment()` function
- `milk_producer_analytics` view
- Indexes and RLS policies

## Testing

### Sample Production Data
```sql
-- Get producer IDs
SELECT id, gamintojas_code, label FROM milk_producers;

-- Insert test data
INSERT INTO milk_production (producer_id, konteineris, production_date, weight_kg, temperature_c)
VALUES
  ('producer-id-here', 'U0483360', '2025-12-18', 445.3, 4.1);
```

### Verify Analytics
```sql
SELECT * FROM milk_producer_analytics;
```

Should show:
- Production stats if milk_production has data
- Quality metrics from milk_quality_tests
- Composition from milk_composition_tests
- Payment calculation combining all factors

## Troubleshooting

### Analytics showing "—" instead of values
- Check that producer has lab test data
- Verify konteineris matches between tables
- Ensure dates are recent (some stats use 30-day windows)

### Wrong quality classification
- Remember: values are in thousands (k)
- 197 = "Puiki" (< 200k)
- 350 = "Gera" (200-400k)
- 500 = "Vidutinė" (400-600k)
- 700 = "Bloga" (> 600k)

### Payment seems incorrect
- Verify fat% and protein% are decimals (3.85 not 385)
- Check SCC/bacteria values are in thousands as stored
- Review function parameters match data scale

## Quality Standards

**Puiki (Excellent)**: SCC < 200k
- Highest quality milk
- +5% price bonus
- Indicates healthy herd

**Gera (Good)**: SCC 200-400k
- Standard quality
- No price adjustment
- Normal range

**Vidutinė (Fair)**: SCC 400-600k
- Below standard
- -5% price penalty
- May indicate health issues

**Bloga (Poor)**: SCC > 600k
- Poor quality
- -15% price penalty
- Requires immediate attention
