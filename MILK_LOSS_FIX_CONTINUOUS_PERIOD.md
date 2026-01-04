# Fix: Milk Loss Calculation - Continuous Period

## Problem Identified

The original implementation was **incorrectly summing individual treatment withdrawal periods**, which led to significantly inflated milk loss calculations when animals had multiple overlapping treatments.

### Example of the Bug

Animal LT000009135948 had 5 treatments:
- Treatment 1 (Dec 12): 7 days
- Treatment 2 (Dec 13): 7 days
- Treatment 3 (Dec 14): 5 days
- Treatment 4 (Dec 19): 6 days
- Treatment 5 (Dec 20): 6 days

**OLD (WRONG) Calculation:** 7 + 7 + 5 + 6 + 6 = **31 days**

**CORRECT Calculation:**
- First treatment: Dec 12
- Last withdrawal ends: Dec 25
- Actual continuous period: **13 days** (+ 1 safety = 14 days)

The old calculation was **more than double** the actual milk loss!

## Solution

### Changed Logic

Instead of summing individual treatment periods, the system now:

1. **Finds the earliest treatment date** among all treatments for an animal
2. **Finds the latest withdrawal end date** among all treatments
3. **Calculates the continuous span** between these dates
4. **Adds 1 safety day** at the end
5. **Uses average milk production** across all treatment periods

### Code Changes

**File: `src/components/TreatmentMilkLossAnalysis.tsx`**

```typescript
// OLD (WRONG) - Summing days
if (existing) {
  existing.total_loss_days += row.total_loss_days;  // ❌ Wrong!
}

// NEW (CORRECT) - Tracking continuous period
if (existing) {
  // Track earliest and latest dates
  const rowTreatmentDate = new Date(row.treatment_date);
  const rowWithdrawalDate = new Date(row.withdrawal_until_milk);

  if (rowTreatmentDate < existing.earliest_treatment_date) {
    existing.earliest_treatment_date = rowTreatmentDate;
  }
  if (rowWithdrawalDate > existing.latest_withdrawal_date) {
    existing.latest_withdrawal_date = rowWithdrawalDate;
  }
}

// Calculate actual continuous period
const daysDiff = Math.ceil(
  (latest_withdrawal_date - earliest_treatment_date) / (1000 * 60 * 60 * 24)
);
const total_days = daysDiff + 1; // +1 for safety day
```

## User Interface Changes

### 1. Warning Banner (Top of Page)
Added prominent amber warning banner explaining:
- Milk losses are calculated as continuous period
- Overlapping days are not counted multiple times
- From first treatment to last withdrawal end date

### 2. Column Header Update
Changed "Dienų" to "Dienų (ištisinis)" with tooltip explaining continuous period calculation.

### 3. Per-Animal Detail Box
When expanding animal details, added blue info box showing:
- "Calculating continuous day period"
- Explanation that overlapping treatments don't count days twice
- Actual calculation: (First date → Last date = X days)

### 4. Individual Treatment Display
Each individual treatment now shows:
- "Karencijos laikotarpis (atskiras)" - Individual withdrawal period
- "Nuostoliai (jei būtų atskiras)" - Loss if this was standalone
- Gray text with note: "*Tikroji suma skaičiuojama pagal visų gydymų laikotarpį"
- This helps users understand why individual periods don't sum to total

## Impact

### Before Fix
```
LT000009135948: 31 days × 47 kg/day × €0.45/kg = €655 ❌ WRONG
```

### After Fix
```
LT000009135948: 14 days × 47 kg/day × €0.45/kg = €296 ✓ CORRECT
```

**Difference:** ~€360 per animal with multiple overlapping treatments

For a farm with many animals receiving multiple treatments, this fix prevents **massive overestimation** of milk losses, leading to:
- More accurate financial reporting
- Better treatment decision-making
- Realistic cost-benefit analysis

## Testing

To verify the fix works correctly:

1. Find an animal with multiple treatments in quick succession
2. Check the "Dienų (ištisinis)" column
3. Expand the animal details
4. Verify the calculation shown in blue box:
   - Should show: (First treatment date → Last withdrawal date = X days)
   - X should be much less than the sum of individual treatments

## Business Logic

**Why Continuous Period is Correct:**

When a cow receives multiple treatments during an ongoing withdrawal period:
- The cow **cannot sell milk continuously** from first treatment until last withdrawal ends
- Each new treatment may **extend** the withdrawal period, but doesn't create a separate loss period
- Days with overlapping withdrawals count as **one day of loss**, not multiple

**Example:**
- Day 1: Treatment A (5-day withdrawal) → Can't sell milk Days 1-5
- Day 2: Treatment B (4-day withdrawal) → Extends to Day 6, but Days 1-2 already counted
- **Total loss:** Days 1-6 = 6 days (not 5+4=9 days)

This matches real-world farming practices and regulatory requirements.

## Files Modified

1. `src/components/TreatmentMilkLossAnalysis.tsx` - Fixed aggregation logic and added UI warnings
2. Built and tested successfully

## Next Steps

- Monitor user feedback on the new calculation
- Consider adding similar continuous period logic to synchronization milk losses if needed
- Document this business logic in user manual
