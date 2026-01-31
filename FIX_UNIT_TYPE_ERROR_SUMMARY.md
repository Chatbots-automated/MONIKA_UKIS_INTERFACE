# Unit Type Casting Error - Fixed

## Problem
Getting error: **"column unit is of type unit but expression is of type text"** when creating/editing visits.

## Root Cause
The database has a `unit` enum type (ml, l, g, kg, vnt, pcs, tabletkė, bolus, syringe), but some database triggers were not properly casting text values to this enum type when inserting into `usage_items` table.

Additionally, the TypeScript `Unit` type was missing 'pcs' value, causing type mismatches.

## What Was Fixed

### 1. Database Triggers (SQL Fix Required)
Two database functions needed updates to properly cast unit values:

**File: `fix-unit-type-casting.sql`**
- Fixed `create_usage_item_from_vaccination()` to cast `NEW.unit::unit`
- Enhanced `process_visit_medications()` with:
  - Proper unit value extraction with default to 'ml'
  - Validation to ensure unit value is not empty
  - Explicit casting to `::unit` enum type
  - Better error handling with try-catch

### 2. TypeScript Types
**File: `src/lib/types.ts`**
- Added 'pcs' to the Unit type definition
- Before: `'ml' | 'l' | 'g' | 'kg' | 'vnt' | 'tabletkė' | 'bolus' | 'syringe'`
- After: `'ml' | 'l' | 'g' | 'kg' | 'vnt' | 'pcs' | 'tabletkė' | 'bolus' | 'syringe'`

### 3. Component Type Definitions
**File: `src/components/AnimalDetailSidebar.tsx`**
- Replaced inline unit type definitions with imported `Unit` type
- Fixed 4 locations:
  - Treatment medications: `unit: Unit`
  - Vaccination data: `unit: Unit`
  - Prevention data: `dose_unit: Unit`
  - Hoof treatment: `treatment_unit?: Unit`

## How to Apply the Fix

### Step 1: Apply SQL Fix (Required!)
The SQL fix **MUST** be applied to your database:

1. Open the file: `fix-unit-type-casting.sql`
2. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
3. Copy and paste the entire SQL file
4. Click "Run"

### Step 2: TypeScript Changes (Already Applied)
The TypeScript changes have been applied and the project builds successfully. No action needed.

## What This Fixes

1. **Visit Creation/Editing** - No more "column unit is of type unit but expression is of type text" errors
2. **Vaccination Records** - Proper unit type casting when creating usage_items
3. **Type Safety** - Consistent Unit type throughout the application
4. **Better Error Handling** - Medications that fail will not block other medications from processing

## Testing

After applying the SQL fix, test:
1. Create a new visit with medications
2. Complete a visit (change status to "Baigtas")
3. Add vaccinations
4. Verify no unit-related errors appear

## Notes

- The database enum type includes both 'vnt' and 'pcs' for compatibility
- All unit values default to 'ml' if not provided
- The system validates that unit values are not empty before insertion
- Each medication is processed independently with error handling
