# Treatment Milk Loss Tracking System

## Overview
This system tracks milk production losses due to medication withdrawal periods (karencines dienos) during animal treatments.

## How It Works

### Example Calculation
When a cow receives medication like "COBACTAN LC 8g, N15":
- Withdrawal period for milk: 5 days
- Safety buffer: +1 day (automatically added)
- Total loss period: 6 days
- Cow's average milk production: 50 kg/day
- Total milk lost: 6 × 50 = 300 kg
- Milk price: €0.45/kg
- **Total financial loss: €135.00**

### Database Components

#### New Functions
1. **get_animal_avg_milk_at_date(animal_id, date)**
   - Gets cow's average daily milk production from `gea_daily` table
   - Uses 30 days of historical data before the treatment date
   - Falls back to most recent data if not enough history

2. **calculate_treatment_milk_loss(treatment_id)**
   - Calculates complete milk loss for a treatment
   - Returns: withdrawal days, safety days, total days, avg daily milk, total lost, price, value
   - Uses withdrawal_until_milk date from treatments table

#### New View
**treatment_milk_loss_summary**
- Shows all treatments with milk withdrawal periods
- Aggregates medications used per treatment
- Calculates financial impact using system_settings milk price
- Includes withdrawal periods for both milk and meat
- Groups data by animal and treatment

### Frontend Components

#### 1. TreatmentMilkLossAnalysis Component
**Location:** `src/components/TreatmentMilkLossAnalysis.tsx`

**Features:**
- Shows milk losses for all animals or specific animal (modal mode)
- Expandable treatment history with medication details
- Summary statistics: total animals, treatments, days, milk lost, value
- Sorting and search functionality
- Shows medications used with their withdrawal periods

**Usage:**
```tsx
// Full view (all animals)
<TreatmentMilkLossAnalysis />

// Modal view (specific animal)
<TreatmentMilkLossAnalysis
  animalId="uuid"
  animalTag="LT000123"
  onClose={() => {}}
/>
```

#### 2. Integration Points

**In TreatmentCostAnalysis:**
- Button added next to "Vizitai" header in animal detail view
- Opens modal showing milk losses for that specific animal
- Icon: Droplet (orange button)

**In TreatmentCostTab:**
- New tab: "Karencija" (Withdrawal Period)
- Shows overview of all treatment milk losses across farm
- Renamed "Pieno Nuostoliai" to "Sinchronizacijos" for clarity

### Data Display

#### Per Animal View
- Animal tag number
- Number of treatments with withdrawals
- Total days of milk loss
- Total milk lost (kg)
- Total financial value lost

#### Per Treatment View (expanded)
- Treatment date and diagnosis
- Withdrawal period dates (start to end)
- Breakdown: withdrawal days + safety days = total
- Average daily milk × total days = total milk lost
- Financial value at current milk price
- List of medications used with their specific withdrawal periods

#### Medication Details
For each medication used:
- Product name
- Quantity and unit
- Withdrawal period for milk (days)
- Withdrawal period for meat (days)

### Migration Instructions

1. **Apply the SQL migration:**
   ```bash
   node apply-treatment-milk-loss.js
   ```

   Or manually in Supabase SQL Editor:
   - Copy contents from `treatment-milk-loss-migration.sql`
   - Paste and run in: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

2. **Migration creates:**
   - Function: `get_animal_avg_milk_at_date`
   - Function: `calculate_treatment_milk_loss`
   - View: `treatment_milk_loss_summary`
   - Grants proper permissions to authenticated users

### Key Features

1. **Automatic Safety Buffer**
   - Always adds 1 extra day to withdrawal period
   - Ensures conservative milk loss calculations

2. **Historical Milk Production**
   - Uses actual 30-day average from `gea_daily`
   - Falls back to most recent data if needed
   - More accurate than fixed estimates

3. **Dynamic Milk Pricing**
   - Reads current price from `system_settings`
   - Defaults to €0.45/kg if not configured
   - Easy to update without code changes

4. **Medication Tracking**
   - Shows all medications used in treatment
   - Displays individual withdrawal periods
   - Links to products via `usage_items` table

### User Interface Locations

1. **Main Overview Tab:**
   - Navigate to: Gydymų Savikainos → Karencija
   - Shows farm-wide milk losses from treatments

2. **Per-Animal Modal:**
   - Navigate to: Gydymų Savikainos → Gydymų Savikainos
   - Expand any animal row
   - Click "Pieno Nuostoliai" button (orange, top right)
   - Modal shows milk losses for that specific animal

### Example Workflow

1. Veterinarian treats cow LT000123 with mastitis medication
2. Treatment recorded with withdrawal_until_milk date
3. System automatically:
   - Looks up cow's average milk production (last 30 days)
   - Calculates withdrawal period from treatment date
   - Adds 1 safety day
   - Multiplies days × daily milk = total lost
   - Multiplies total × milk price = financial loss
4. User views loss in Karencija tab or animal detail modal
5. Decision support: Is treatment cost-effective vs. milk loss?

### Data Requirements

**Essential:**
- `treatments.withdrawal_until_milk` - must be set
- `gea_daily.milk_avg` - historical milk production data
- `system_settings.milk_price_per_liter` - current milk price

**Optional but recommended:**
- `products.withdrawal_milk_days` - medication withdrawal periods
- `products.withdrawal_meat_days` - for complete tracking
- `usage_items` - links treatments to medications used

### Benefits

1. **Financial Transparency**
   - See true cost of treatments including lost milk
   - Make informed decisions about treatment vs. culling

2. **Historical Tracking**
   - Monitor milk losses over time
   - Identify patterns or problematic medications

3. **Regulatory Compliance**
   - Track withdrawal periods automatically
   - Ensure food safety requirements met

4. **Farm Management**
   - Understand full economic impact of animal health
   - Optimize treatment protocols
   - Budget for expected milk losses
