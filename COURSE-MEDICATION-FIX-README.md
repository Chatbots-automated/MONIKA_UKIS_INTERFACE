# Course Medication Deduction Fix - Implementation Guide

## Problem Summary

When creating a treatment with a course duration (e.g., 3 days with 60ml total = 20ml/day):
- **OLD BEHAVIOR**: ALL 60ml was immediately deducted from inventory
- **RISK**: If animal dies on day 1, only 20ml was actually used, but 60ml was recorded as used
- **RESULT**: Inventory discrepancies and potential compliance fines

## Solution Implemented

### What Changes

1. **Medications are now deducted PER VISIT, not per course**
   - Day 1 visit marked "Baigtas" → 20ml deducted
   - Day 2 visit marked "Baigtas" → 20ml deducted
   - Day 3 visit marked "Baigtas" → 20ml deducted

2. **Planned medications are visible**
   - Each future visit shows which medications are planned
   - Clear indicator: "Nusirašys kai vizitas bus užbaigtas"

3. **Auto-enable next visit for check-ups**
   - When creating a course treatment, "Reikia sekančio vizito" is automatically enabled
   - Next visit date is set to 3 days after the last treatment day

4. **Proper registration numbers**
   - Each completed visit creates its own treatment record with proper date
   - Maintains compliance for reporting

## Database Migration Required

**IMPORTANT**: You must apply the database migration before using this feature!

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Apply Migration
1. Click "New Query"
2. Copy the entire contents of: `supabase/migrations/20251118120000_course_medication_deduction_on_completion.sql`
3. Paste into the SQL editor
4. Click "Run" or press Ctrl+Enter

### Step 3: Verify Migration
Run this query to verify the new columns exist:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'animal_visits'
AND column_name IN ('planned_medications', 'medications_processed', 'related_visit_id');
```

You should see 3 rows returned.

## How It Works

### Creating a Course Treatment

1. **User creates visit with treatment**
   - Selects "Gydymas" procedure
   - Adds medication with "Kursas (keli dienas)" checked
   - Enters duration (e.g., 3 days)
   - Enters total quantity (e.g., 60ml)

2. **System automatically:**
   - Calculates daily dose (60ml / 3 days = 20ml/day)
   - Creates main visit with TODAY's data
   - Creates 2 future visits (Day 2 and Day 3)
   - Stores `planned_medications` in each visit
   - Auto-enables "Reikia sekančio vizito" with check-up date

3. **When each visit is marked "Baigtas":**
   - Database trigger automatically runs
   - Creates `usage_items` record with that day's dose
   - Deducts from inventory (only that day's amount)
   - Creates proper treatment record with registration number
   - Marks `medications_processed = true` (prevents double-deduction)

### What Users See

#### Before Visit Completion
```
📅 Vizitas - 2024-11-18 10:00
Procedūros: Gydymas
Status: Planuojamas

📦 Planuojami vaistai:
• Penicilin: 20 ml
Nusirašys kai vizitas bus užbaigtas
```

#### After Visit Completion
```
📅 Vizitas - 2024-11-18 10:00
Procedūros: Gydymas
Status: Baigtas

✅ Panaudota:
• Penicilin: 20 ml
```

## Testing the Fix

### Test Scenario 1: 3-Day Course
1. Create an animal visit with Gydymas
2. Add medication: 60ml, mark as "Kursas", enter 3 days
3. Save the visit
4. **Verify**:
   - Main visit created with status "Planuojamas" or "Baigtas"
   - 2 future visits created (tomorrow and day after)
   - Each future visit shows "Planuojami vaistai: 20ml"
   - "Reikia sekančio vizito" is checked
   - Next visit date is 6 days from now (3 days treatment + 3 days)

5. Check inventory:
   - If main visit status is "Baigtas": 20ml deducted
   - If main visit status is "Planuojamas": 0ml deducted

6. Mark tomorrow's visit as "Baigtas"
   - Another 20ml should be deducted
   - "Planuojami vaistai" badge should disappear

### Test Scenario 2: Animal Dies During Treatment
1. Create 3-day course with 60ml total
2. Mark Day 1 visit as "Baigtas" → 20ml deducted
3. Animal dies before Day 2
4. **Result**: Only 20ml is recorded as used (accurate!)
5. Future visits remain with status "Planuojamas"
6. Can mark them as "Atšauktas" or "Neįvykęs"

## Important Notes

### For Single-Day Treatments
- No change in behavior
- Medications are deducted immediately if visit status is "Baigtas"
- If status is "Planuojamas", medications are stored as planned and deducted when status changes to "Baigtas"

### For Editing Visits
- Existing logic maintained
- Can still edit visit details
- Medication processing only happens once per visit

### Inventory Safety
- The trigger uses `medications_processed` flag to prevent double-deduction
- Even if status changes multiple times, medications are only deducted once
- Uses `GREATEST(0, quantity - amount)` to prevent negative inventory

## Compliance Benefits

1. **Accurate Inventory**: Only records medications actually administered
2. **Proper Registration**: Each visit gets its own treatment record with correct date
3. **Audit Trail**: Clear visibility of planned vs. actual medications
4. **Fine Prevention**: No more discrepancies between recorded and actual usage

## Troubleshooting

### Medications not deducting when marking visit as "Baigtas"
- Verify migration is applied
- Check that `planned_medications` column has data
- Check that `medications_processed` is false

### Double deduction occurring
- Should be prevented by `medications_processed` flag
- Check trigger logic in database

### Future visits not being created
- Verify `recurring_days` data is being set correctly
- Check console for error messages
- Verify RLS policies allow insert

## Files Changed

1. **Database**:
   - `supabase/migrations/20251118120000_course_medication_deduction_on_completion.sql`
   - Adds 3 new columns to `animal_visits`
   - Adds trigger function `process_visit_medications()`

2. **Frontend**:
   - `src/components/AnimalDetailSidebar.tsx`
   - Modified visit creation logic
   - Modified medication deduction logic
   - Added UI for planned medications display
   - Auto-enable next visit for courses

3. **Helpers**:
   - `src/lib/helpers.ts`
   - Added `normalizeNumberInput()` for comma support
   - Added `parseNumberInput()` for number parsing

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify migration was applied correctly
4. Test with a simple 2-day course first
