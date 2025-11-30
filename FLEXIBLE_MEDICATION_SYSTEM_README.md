# Flexible Per-Visit Medication Scheduling System

## Overview

This implementation transforms the medication course system from automatic quantity division to flexible per-visit scheduling. The new system allows:

- **Flexible scheduling**: Define which medications are used on which specific dates
- **Per-visit quantity entry**: Enter actual quantities when each visit is completed
- **Multiple medications per visit**: Schedule different medications for different days
- **Full editing capability**: Add, remove, or modify medications at the visit level

---

## What Has Been Implemented

### 1. Database Schema Changes

**New Table: `course_medication_schedules`**
- Maps medications to specific visit dates within a treatment course
- Allows scheduling different medications on different days
- Tracks which medications have been administered at each visit

**Schema Updates:**
- Fixed NOT NULL constraint on `course_doses.dose_amount` (allows NULL until visit completion)
- Added `medication_schedule_flexible` boolean flag to `treatment_courses`
- Added `course_id` reference to `animal_visits` table

**Helper Functions:**
- `get_scheduled_medications_for_visit()` - Returns medications scheduled for a specific date
- `course_has_flexible_schedule()` - Checks if course uses flexible scheduling
- `get_course_progress()` - Returns course completion statistics
- `validate_visit_medications()` - Validates all medications have quantities before completion
- `link_medications_to_visit()` - Links schedule entries to actual visits

**Views:**
- `vw_course_schedules` - Overview of all flexible courses with progress tracking
- `vw_visits_needing_medication_entry` - Lists visits requiring medication quantity entry

### 2. React Components

**CourseMedicationScheduler** (`src/components/CourseMedicationScheduler.tsx`)
- Multi-step wizard for course creation
- Step 1: Select treatment dates (minimum 2 days required)
- Step 2: Assign medications to each date
- Step 3: Review and confirm schedule
- Visual calendar interface showing course timeline
- Validation to ensure at least one medication per date

**VisitMedicationEditor** (`src/components/VisitMedicationEditor.tsx`)
- Per-visit medication management interface
- Shows scheduled medications (blue badges) vs added medications (green badges)
- Allows adding extra medications not in the original schedule
- Quantity input with inventory validation
- Real-time stock checking and warnings
- Batch selection with expiry date sorting
- Teat selector integration for udder-specific treatments

**Updated Components:**
- `AnimalDetailSidebar.tsx` - Integrated course scheduler modal
- Treatment form now has "Planuoti kursą" (Plan Course) button instead of simple day counter
- Course badge shows: "✓ Kursas: X dienų - Kiekis įvedamas per kiekvieną vizitą"

### 3. Workflow Changes

**Old Workflow (Automatic Division):**
1. User creates treatment with medication
2. Checks "Kursas" checkbox and enters number of days
3. System automatically divides total dose across all days
4. Future visits created with pre-calculated quantities
5. No flexibility to change medications per visit

**New Workflow (Flexible Scheduling):**
1. User creates treatment with medication
2. Clicks "Planuoti kursą" (Plan Course) button
3. Course scheduler opens:
   - Select all treatment dates (e.g., Day 1, Day 3, Day 5)
   - For each date, assign one or more medications
   - Each medication can have different unit, teat, purpose
   - Review complete schedule before confirming
4. System creates visits with `planned_medications` (quantities = NULL)
5. When completing each visit:
   - User sees scheduled medications
   - Enters actual quantity used for each
   - Can add extra medications or remove planned ones
   - System validates all have quantities before completion
6. On visit completion:
   - Inventory is deducted
   - `course_doses` table is updated with actual amounts
   - Withdrawal dates recalculated if needed

---

## How to Apply the Changes

### Step 1: Apply Database Migration

The database migration SQL is ready in:
```
flexible_medication_scheduling_migration.sql
```

**Apply it by running this file in your Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Copy the entire contents of `flexible_medication_scheduling_migration.sql`
3. Paste into the SQL Editor
4. Click "Run" to execute

**What the migration does:**
- ✅ Removes NOT NULL constraint from `course_doses.dose_amount`
- ✅ Creates `course_medication_schedules` table with RLS policies
- ✅ Adds new columns to `treatment_courses` and `animal_visits`
- ✅ Creates 6 helper functions for course management
- ✅ Creates 2 views for easy data querying
- ✅ Marks all existing courses as non-flexible (they continue using old system)

### Step 2: Frontend is Ready

The React components are already built and integrated:
- ✅ `CourseMedicationScheduler.tsx` created
- ✅ `VisitMedicationEditor.tsx` created
- ✅ `AnimalDetailSidebar.tsx` updated
- ✅ All imports and state management configured
- ✅ Build successful (no TypeScript errors)

### Step 3: Test the New Workflow

**Create a Test Course:**
1. Open an animal's detail sidebar
2. Click "Naujas vizitas" (New Visit)
3. Select "Gydymas" procedure
4. Add a medication (select product and batch)
5. Click "Planuoti kursą" button (new purple button)
6. Course Scheduler opens:
   - Add treatment dates (click "Pridėti dieną")
   - Navigate between dates
   - Assign medications to each date
   - Review schedule
   - Confirm
7. Visit is created with future visits scheduled

**Complete a Visit with Medications:**
1. Open a scheduled visit (from future visits list)
2. See scheduled medications listed
3. Enter quantity for each medication
4. Optionally add extra medications
5. Complete the visit
6. Verify inventory was deducted
7. Check withdrawal dates were updated

---

## Key Features

### Multi-Step Course Planning
- Visual wizard guides users through course setup
- Clear progress indicators (Step 1, 2, 3)
- Can go back and forth between steps
- Validation at each step

### Flexible Medication Assignment
- Different medications on different days
- Multiple medications per visit
- Teat-specific tracking (D1, D2, K1, K2)
- Purpose field for each medication

### Per-Visit Management
- Clear distinction between scheduled and added medications
- Real-time inventory checking
- Batch expiry date sorting
- Visual feedback (badges, icons, warnings)

### Data Integrity
- NULL quantities until visit completion
- Validation before allowing completion
- Cannot complete visit without entering quantities
- Proper inventory deduction only on completion

### Course Progress Tracking
- View showing all courses with progress
- Completed vs pending visits
- Next visit date
- Course status

---

## Technical Details

### Database Schema

**course_medication_schedules Table:**
```sql
CREATE TABLE course_medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES treatment_courses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  batch_id uuid REFERENCES batches(id),
  scheduled_date date NOT NULL,
  visit_id uuid REFERENCES animal_visits(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'ml',
  teat text CHECK (teat IN ('d1', 'd2', 'k1', 'k2')),
  purpose text DEFAULT 'Gydymas',
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### Data Flow

**Course Creation:**
```
User Input → CourseMedicationScheduler
           → Schedule Data (dates + medications)
           → treatment_courses (medication_schedule_flexible = true)
           → course_medication_schedules (one row per med per date)
           → animal_visits (with planned_medications, qty = NULL)
```

**Visit Completion:**
```
Visit → VisitMedicationEditor
     → User enters quantities
     → validate_visit_medications()
     → Deduct from inventory
     → Update course_doses
     → Mark medications_processed = true
     → Recalculate withdrawal dates
```

### Component Props

**CourseMedicationScheduler:**
```typescript
{
  animalId: string;
  initialStartDate?: string;
  onConfirm: (schedule: DateMedications[]) => void;
  onCancel: () => void;
}
```

**VisitMedicationEditor:**
```typescript
{
  visitId: string;
  plannedMedications: any[];
  onUpdate: (medications: VisitMedication[]) => void;
  readOnly?: boolean;
}
```

---

## Benefits Over Old System

1. **Accuracy**: Actual usage is recorded, not estimates
2. **Flexibility**: Can change medications at any visit
3. **Control**: Full visibility and control over each visit
4. **Inventory**: Better inventory tracking and forecasting
5. **Compliance**: More accurate withdrawal date calculations
6. **Auditing**: Complete history of what was actually used

---

## Migration Notes

### Backwards Compatibility
- ✅ All existing courses continue working (marked as `medication_schedule_flexible = false`)
- ✅ Old course display logic preserved
- ✅ No data loss or breaking changes
- ✅ Users can continue using old system or adopt new one

### Future Enhancements
- [ ] Course editing functionality (modify future visits)
- [ ] Copy course schedule to another animal
- [ ] Templates for common treatment protocols
- [ ] Bulk schedule creation for herd treatments
- [ ] SMS reminders for upcoming course visits
- [ ] Course analytics and completion rates

---

## Troubleshooting

### If migration fails:
1. Check you're using service role key (not anon key)
2. Verify no other migrations are running
3. Check for conflicts with existing custom modifications
4. Run migration in smaller chunks if needed

### If course scheduler doesn't open:
1. Check browser console for errors
2. Verify medication product is selected first
3. Clear browser cache and reload
4. Check that visit date is set

### If quantities don't save:
1. Verify batch is selected
2. Check inventory availability
3. Ensure quantity is a valid number
4. Verify batch expiry date hasn't passed

---

## Support

For questions or issues:
1. Check this README first
2. Review the migration SQL comments
3. Check browser console for error messages
4. Verify database migration was applied successfully
5. Test with a fresh animal/visit to rule out data issues

---

**Implementation Complete** ✅
- Database schema: ✅ Ready to apply
- React components: ✅ Built and integrated
- Build status: ✅ Successful
- Documentation: ✅ Complete
