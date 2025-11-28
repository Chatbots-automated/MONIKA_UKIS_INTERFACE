# Prevention Course Implementation

## Overview
Prevention (Profilaktika) now supports multi-day courses, working exactly like treatment courses. This allows you to create prevention protocols that span multiple days (e.g., 3 boluses over 3 days), with medications only being deducted when each visit is marked as "Baigtas" (completed).

## What Was Changed

### 1. Frontend (AnimalDetailSidebar.tsx)
- **Updated prevention data structure** to include:
  - `is_course`: Boolean flag to indicate if this is a multi-day course
  - `course_days`: Number of days the course should run

- **Enhanced prevention form UI** with:
  - Checkbox to enable course mode: "Kursas (keli dienas)"
  - Input field for number of days
  - Real-time calculation showing daily dose (e.g., "= 20.00 bolus / dieną")

- **Implemented course logic** that:
  - Creates the first visit with planned medications
  - Automatically creates future visits for days 2, 3, etc.
  - Only deducts medications from inventory when each visit is marked as "Baigtas"
  - Links all visits together via `related_visit_id`

### 2. Database (process_visit_medications function)
- **Updated the trigger function** to handle both treatment AND prevention medications:
  - Checks if visit has "Profilaktika" procedure
  - Creates `biocide_usage` records for prevention medications (instead of `usage_items`)
  - Properly processes medications only when visit status changes to "Baigtas"
  - Prevents double-deduction with `medications_processed` flag

## How It Works

### Creating a Prevention Course

1. Open animal detail sidebar → "Naujas vizitas"
2. Select "Profilaktika" procedure
3. Add product (e.g., bolus for prevention)
4. Enter **total quantity** (e.g., 3 boluses for 3 days)
5. Check "Kursas (keli dienas)"
6. Enter number of days (e.g., 3)
7. System shows daily dose: "= 1.00 bolus / dieną"
8. Save the visit

### What Happens Automatically

- **Day 1**: Visit created with status "Planuojamas"
  - When marked as "Baigtas": 1 bolus deducted from inventory

- **Day 2**: Auto-created visit with status "Planuojamas"
  - When marked as "Baigtas": 1 bolus deducted from inventory

- **Day 3**: Auto-created visit with status "Planuojamas"
  - When marked as "Baigtas": 1 bolus deducted from inventory

### Safety Features

- Medications are **only deducted when visit is completed**
- If an animal dies or treatment is stopped, unused medications remain in inventory
- All future visits are linked together and can be viewed in the visit history
- Each visit has `planned_medications` stored as JSONB for reference

## Database Migration

⚠️ **IMPORTANT**: You must apply the database migration for this to work!

### Steps to Apply:

1. Run the helper script to see the SQL:
   ```bash
   node apply_prevention_course.js
   ```

2. Copy the SQL output

3. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new

4. Paste and run the SQL

5. Verify the function was updated:
   ```sql
   SELECT routine_name, routine_definition
   FROM information_schema.routines
   WHERE routine_name = 'process_visit_medications';
   ```

Alternatively, you can find the migration SQL in: `prevention_course_migration.sql`

## Example Use Cases

### 3-Day Bolus Course
- Product: "Bolus prevencijai"
- Total: 3 boluses
- Days: 3
- Daily dose: 1 bolus/day
- Result: 3 visits created (Day 1, 2, 3), each deducts 1 bolus when completed

### 5-Day Liquid Prevention
- Product: "Antiparazitinis skystis"
- Total: 100 ml
- Days: 5
- Daily dose: 20 ml/day
- Result: 5 visits created, each deducts 20ml when completed

## Technical Details

### Database Schema
- Uses existing `animal_visits.planned_medications` column (JSONB)
- Uses existing `animal_visits.medications_processed` flag (boolean)
- Uses existing `animal_visits.related_visit_id` for linking visits

### Frontend Flow
1. User enters total quantity for entire course
2. System calculates daily dose: `totalQty / days`
3. Creates first visit with all course information
4. Creates future visits (day 2+) with same daily dose
5. Each visit stores `planned_medications` with daily dose

### Backend Flow (Trigger)
1. Visit status changes to "Baigtas"
2. Trigger reads `planned_medications` from visit
3. Checks if procedure is "Profilaktika"
4. Creates `biocide_usage` record with daily dose
5. Sets `medications_processed = true`

## Compatibility

- ✅ Works with existing treatment course system
- ✅ Works with single-dose prevention (no course)
- ✅ Works with existing inventory tracking
- ✅ Compatible with all product types (bolus, ml, g, etc.)
- ✅ Supports multiple products per prevention visit

## Testing Checklist

- [ ] Create 3-day prevention course
- [ ] Verify 3 visits are created automatically
- [ ] Complete Day 1 visit → check inventory deducted correctly
- [ ] Complete Day 2 visit → check inventory deducted correctly
- [ ] Complete Day 3 visit → check inventory deducted correctly
- [ ] Verify total deducted = total course quantity
- [ ] Test with different product types (bolus, ml, g)
- [ ] Test with multiple products in one visit

## Support

If you encounter issues:
1. Check that the database migration was applied successfully
2. Verify that products have the correct category ("prevention" or "biocide")
3. Check console logs for any errors
4. Verify inventory batches have sufficient stock
