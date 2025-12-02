# Profitability & Treatment ROI Decision Support System

## Overview

A comprehensive financial intelligence system that transforms your veterinary management system from a record-keeping tool into a strategic business intelligence platform. This system helps the owner make data-driven decisions about whether to treat or cull animals, track profitability, and optimize the herd.

## Features Implemented

### 1. **Database Foundation**
- **System Settings Table**: Configurable business parameters (milk price, cow sale value, etc.)
- **Profitability Views**: Real-time calculation of profitability metrics
- **Performance Indexes**: Optimized queries for fast data retrieval

### 2. **Pelningumas (Profitability) Tab**
- Individual animal profitability tracking
- Revenue from milk production (GEA data integration)
- Treatment costs breakdown
- Net profit calculation per animal
- ROI percentage calculation
- Visual profit indicators (green for profitable, red for loss-making)
- Real-time sorting and filtering by tag number or collar number

### 3. **Gydymo Sprendimai (Treatment Decisions) Tab**
**"Should I Treat This Cow?" Calculator**
- Input expected treatment cost
- Automatic ROI calculation
- Payback period estimation (days to recover treatment cost)
- Success rate analysis based on historical data
- Three recommendation levels:
  - **GYDYTI (TREAT)**: Good investment, quick payback
  - **STEBĖTI (MONITOR)**: Marginal case, needs observation
  - **ŠALINTI (CULL)**: Treatment won't pay back, recommend removal

### 4. **Bandos Analizė (Herd Analysis) Tab**
- **Top 10 Most Profitable Cows**: Revenue heroes
- **Top 10 Least Profitable Cows**: Money losers
- **Recommendation Summary**:
  - Profitable animals
  - Animals to monitor
  - At-risk animals
  - Chronic treatment cases
  - Culling candidates

### 5. **Executive Summary Dashboard**
Four key KPI cards showing:
- **Total Herd Profit**: Overall profitability with per-animal average
- **Milk Revenue**: Total revenue from milk production
- **Treatment Costs**: Total veterinary expenses with cost-to-revenue ratio
- **Profitable Animals**: Count and percentage of profitable vs unprofitable cows

## Business Intelligence Metrics

### Revenue Calculation
- Milk production tracked from GEA daily data (m1_qty + m2_qty + m3_qty + m4_qty + m5_qty)
- Configurable milk price per liter (default: €0.45)
- Withdrawal period revenue loss calculation
- Adjusted revenue accounts for lost production

### Cost Tracking
- Treatment medication costs from usage_items
- Visit costs (€10 per visit default)
- Vaccination costs
- Total costs aggregated per animal

### Profitability Metrics
- **Net Profit**: (Milk Revenue - Withdrawal Loss) - Total Costs
- **ROI Percentage**: (Net Profit / Total Costs) × 100
- **Cost-to-Revenue Ratio**: (Total Costs / Revenue) × 100
- **Days to Payback**: Treatment Cost / Daily Revenue

### Treatment Decision Intelligence
- Historical treatment success rates
- Average treatment costs per animal
- Chronic case identification (3+ treatments in 90 days)
- Profitability-based recommendations

## Database Migration

**File**: `supabase/migrations/20251202000000_create_profitability_system.sql`

### To Apply Migration:

1. **Option A: Manual Application**
   ```sql
   -- Connect to your Supabase database
   -- Run the migration file contents
   ```

2. **Option B: Using Supabase CLI** (if available)
   ```bash
   supabase db push
   ```

### Tables Created:
- `system_settings`: Configurable business parameters

### Views Created:
- `vw_animal_milk_revenue`: Milk production and revenue per animal
- `vw_animal_profitability`: Comprehensive profitability analysis
- `vw_treatment_roi_analysis`: Treatment ROI for decision support
- `vw_herd_profitability_summary`: Aggregate herd metrics

### Functions Created:
- `get_setting(key, default_value)`: Helper to retrieve configurable settings

## Configuration Settings

Default values (adjustable by admin users):

| Setting | Default | Description |
|---------|---------|-------------|
| milk_price_per_liter | €0.45 | Price received per liter of milk |
| avg_cow_sale_price | €800 | Average price when selling a cow |
| profitability_period_days | 90 | Days to calculate profitability over |
| treatment_decision_threshold | 30 | Days to payback threshold for decisions |
| withdrawal_daily_loss | €15 | Estimated daily loss during withdrawal |

## Usage

### Accessing the System
1. Navigate to **Gydymų Savikainos** section
2. Click on **Pelningumas & ROI** tab
3. Explore the three sub-tabs:
   - **Pelningumas**: View individual animal profitability
   - **Gydymo Sprendimai**: Use the treatment decision calculator
   - **Bandos Analizė**: See herd-wide analytics

### Making Treatment Decisions
1. Go to "Gydymo Sprendimai" tab
2. Select the animal from dropdown
3. Enter estimated treatment cost in EUR
4. Click "Skaičiuoti Rekomendaciją"
5. Review the recommendation and supporting metrics:
   - Days to payback
   - Daily revenue from animal
   - Current profit status
   - Historical success rate

### Monitoring Herd Performance
1. Check the summary KPI cards at the top
2. Review the "Bandos Analizė" tab regularly
3. Identify:
   - Top performers to protect and replicate
   - Bottom performers to consider culling
   - Chronic cases requiring special attention

## Business Value

### Financial Benefits
- **Identify profit leaks**: See exactly which animals are costing money
- **Optimize treatment decisions**: Know if treatment will pay back before spending
- **Reduce inventory waste**: Better treatment planning reduces expired stock
- **Improve cash flow**: Predict upcoming costs and revenue

### Operational Benefits
- **Data-driven culling**: Remove unprofitable animals with confidence
- **Treatment prioritization**: Focus resources on animals that will benefit most
- **Early problem detection**: Spot declining profitability before it's too late
- **Herd composition optimization**: Maintain the most profitable mix

### Strategic Benefits
- **Budget planning**: Accurate forecasting based on real data
- **Investment decisions**: Know ROI on treatments and prevention programs
- **Performance benchmarking**: Compare animal performance objectively
- **Business growth**: Understand true profitability to guide expansion

## Technical Details

### Component Structure
- `ProfitabilityDashboard.tsx`: Main profitability analytics component
- `TreatmentCostTab.tsx`: Updated to include profitability tab
- `TreatmentCostAnalysis.tsx`: Existing cost analysis (unchanged)

### Data Flow
1. GEA daily data provides milk production metrics
2. Treatment, visit, and vaccination data provides costs
3. Database views calculate profitability in real-time
4. Frontend components display insights and recommendations

### Performance Optimizations
- Indexed queries on `gea_daily` for fast milk data retrieval
- Partial indexes on recent treatments/vaccinations
- Pre-aggregated views for dashboard KPIs
- 90-day rolling window reduces data volume

## Future Enhancements

Potential additions for even more value:

1. **Predictive Analytics**: ML models to predict future profitability
2. **Forecasting Tools**: Project revenue and costs for next 30/60/90 days
3. **Comparative Analytics**: Compare profitability across lactation numbers, groups, etc.
4. **Export Reports**: PDF/Excel exports of profitability reports
5. **Alert System**: Automatic notifications when animals become unprofitable
6. **Historical Trends**: Track profitability changes over time with charts
7. **Breeding Value**: Factor in breeding potential for culling decisions
8. **Feed Cost Integration**: Include feed costs for complete profitability picture

## Support

If you encounter any issues:
1. Ensure the database migration has been applied successfully
2. Verify GEA data is being populated in `gea_daily` table
3. Check that milk price settings are configured correctly
4. Confirm animals have recent GEA data for accurate calculations

## Conclusion

This profitability system provides the owner with complete financial transparency and decision support tools. No more paper spreadsheets - everything is automated, real-time, and actionable. The "Should I Treat?" calculator alone could save thousands of euros by preventing bad treatment investments on animals that won't recover their costs.

The owner now has a powerful business intelligence platform that helps run the veterinary practice like a data-driven business!
