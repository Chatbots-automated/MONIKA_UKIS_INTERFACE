# Treatment Transfer Analysis

## Overview
Transfer a treatment (and all its related data) from one animal to another.

## Database Relationships

### 1. **treatments** table
- `animal_id` → `animals(id)` - **PRIMARY LINK** (needs to change)
- `visit_id` → `animal_visits(id)` - Visit that created this treatment

### 2. **treatment_courses** table
- `treatment_id` → `treatments(id)` CASCADE DELETE
- Contains medication courses for the treatment
- **NO direct animal_id** - inherits from treatment

### 3. **course_medication_schedules** table
- `course_id` → `treatment_courses(id)` CASCADE DELETE
- `visit_id` → `animal_visits(id)` SET NULL
- Schedules for medication administration
- **NO direct animal_id** - inherits from course

### 4. **course_doses** table
- `course_id` → `treatment_courses(id)` CASCADE DELETE
- Individual dose records
- **NO direct animal_id** - inherits from course

### 5. **usage_items** table
- `treatment_id` → `treatments(id)` CASCADE DELETE
- Products/medications used in treatment
- **NO direct animal_id** - inherits from treatment

### 6. **animal_visits** table
- `animal_id` → `animals(id)` CASCADE DELETE - **NEEDS TO CHANGE**
- `related_treatment_id` → `treatments(id)` SET NULL
- `course_id` → `treatment_courses(id)` SET NULL
- **CRITICAL**: Visits are tied to specific animal

## Transfer Strategy

### What needs to change:
1. **treatments.animal_id** - Change to new animal
2. **treatments.visit_id** - Must be handled carefully:
   - If visit exists and is tied to old animal → options:
     a) Set to NULL (decouple from original visit)
     b) Create new visit for new animal
     c) Update the visit's animal_id (risky - visit might have other data)

3. **animal_visits** - All future visits related to this treatment:
   - Find visits where `related_treatment_id = treatment.id`
   - Find visits where `course_id IN (courses for this treatment)`
   - Change their `animal_id` to new animal
   - **ONLY** change future/pending visits (status = 'Planuojamas')
   - **DO NOT** change completed visits (status = 'Baigtas')

### What cascades automatically:
- `treatment_courses` - No change needed (no animal_id)
- `course_medication_schedules` - No change needed (no animal_id)
- `course_doses` - No change needed (no animal_id)
- `usage_items` - No change needed (no animal_id)

## Implementation Plan

### Step 1: Database Function
Create a PostgreSQL function `transfer_treatment_to_animal` that:
1. Validates both animals exist
2. Validates treatment exists and belongs to old animal
3. Updates `treatments.animal_id`
4. Finds all pending visits related to this treatment
5. Updates those visits' `animal_id`
6. Returns summary of changes

### Step 2: Frontend UI
Modify `CriticalDataEditor.tsx` to:
1. Show animal selection dropdown
2. Show treatment details and what will be transferred
3. Show list of future visits that will be affected
4. Require confirmation with detailed summary
5. Log the transfer action

### Step 3: Audit Trail
Log:
- Old animal ID and tag
- New animal ID and tag
- Treatment ID
- Number of future visits affected
- Reason for transfer (user input)
- Timestamp and user

## Edge Cases to Handle

1. **Withdrawal periods**: 
   - Old animal loses withdrawal period
   - New animal gains withdrawal period
   - Need to recalculate based on new animal's milk production

2. **Completed visits**:
   - Keep with old animal (historical record)
   - Only transfer pending/future visits

3. **Treatment courses in progress**:
   - Continue with new animal
   - Medication schedule continues

4. **Original visit**:
   - If treatment has a visit_id, that visit stays with old animal
   - It's the historical record of when treatment started

## Safety Checks

1. Cannot transfer to same animal
2. Cannot transfer if treatment is already completed
3. Warn if new animal has conflicting treatments
4. Warn if new animal has different species
5. Confirm withdrawal period implications
