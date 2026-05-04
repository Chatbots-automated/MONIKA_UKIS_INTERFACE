# Economic Groups for Exported Animals - Implementation Summary

## Overview
Added a new "Ekonominė grupė" (Economic Group) column to the exported animals list (Išvežtų Gyvūnų Sąrašas) under the Veterinarija module. Economic groups can be manually assigned to each exported animal, and the data is visible in a new report under the Buhalterija module.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20260504000001_add_economic_groups.sql`

Created a new migration that:
- Creates `economic_groups` table with the following fields:
  - `id` (UUID, primary key)
  - `name` (TEXT, unique - the group name)
  - `description` (TEXT, optional description)
  - `color` (TEXT, hex color code for visual identification)
  - `is_active` (BOOLEAN, for soft deletion)
  - `created_at`, `updated_at` (timestamps)

- Adds `economic_group_id` column to the `animal_departures` table (foreign key to `economic_groups`)

- Updates the `vw_animal_departures_with_conflicts` view to include economic group information

- Inserts default economic groups:
  - "Pelningos karvės" (Profitable cows) - Green
  - "Ūkio turtai" (Farm assets) - Blue
  - "Mėsinės karvės" (Meat cows) - Red
  - "Veršeliai" (Calves) - Amber
  - "Skerdimui" (For slaughter) - Gray

- Sets up RLS (Row Level Security) policies for authenticated users

### 2. AnimalDepartures Component Updates
**File:** `src/components/AnimalDepartures.tsx`

Enhanced the component with:
- Added new interface `EconomicGroup` to manage economic group data
- Updated `AnimalDeparture` interface to include economic group fields:
  - `economic_group_id`
  - `economic_group_name`
  - `economic_group_color`

- Added state management for:
  - Economic groups list
  - Group management modal visibility
  - Group editing state
  - Form fields (name, description, color)

- New functions:
  - `fetchEconomicGroups()` - Loads all active economic groups
  - `updateEconomicGroup(departureId, groupId)` - Updates the economic group for an animal
  - `saveEconomicGroup()` - Creates or updates an economic group
  - `openGroupModal(group?)` - Opens the modal for creating/editing groups

- UI Changes:
  - Added "Valdyti ekonomines grupes" button in the header
  - Added new "Ekonominė grupė" column in the table
  - Each row has a dropdown to select/change the economic group
  - Shows a colored badge with the group name when assigned
  - New modal for managing economic groups with:
    - Form to create/edit groups
    - Name, description, and color picker inputs
    - List of existing groups with edit buttons

### 3. Buhalterija Reports Component Updates
**File:** `src/components/buhalterija/Reports.tsx`

Added new report functionality:
- Updated `ReportData` interface to include `exportedAnimals` array
- Added `'exported-animals'` to the `activeReport` state type
- Modified `loadReportData()` to fetch exported animals data from the database
- Updated `exportToCSV()` to handle the new report type and export to CSV
- Added new tab "Išvežti gyvūnai" (Exported Animals) to the report tabs
- Created new report view showing:
  - Summary statistics (total animals, conflicts)
  - Table with columns:
    - Gyvūno Nr. (Animal Number)
    - Išvežimo data (Departure Date)
    - Lytis (Gender)
    - Ekonominė grupė (Economic Group - with colored badge)
    - Vieta (Location)
    - Statusas (Status - OK or Conflict)
  - Color-coded rows (red for conflicts, hover effect for others)
  - Export functionality to CSV

## How to Apply the Changes

### 1. Apply Database Migration

Run the migration using Supabase CLI or through the Supabase Dashboard:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually through Supabase Dashboard:
# - Go to SQL Editor
# - Copy the contents of supabase/migrations/20260504000001_add_economic_groups.sql
# - Execute the SQL
```

### 2. Verify the Changes

1. **Check the Database:**
   - Verify the `economic_groups` table was created
   - Verify the `animal_departures` table has the new `economic_group_id` column
   - Verify the view `vw_animal_departures_with_conflicts` includes economic group fields
   - Check that 5 default economic groups were inserted

2. **Test the Veterinarija Module:**
   - Navigate to the "Išvežti Gyvūnai" section
   - Click "Valdyti ekonomines grupes" button
   - Try creating a new economic group
   - Assign economic groups to animals using the dropdown
   - Verify the colored badge appears after assignment
   - Edit an existing group and verify changes are saved

3. **Test the Buhalterija Module:**
   - Navigate to Buhalterija > Ataskaitos
   - Click on the "Išvežti gyvūnai" tab
   - Verify the list shows exported animals with their economic groups
   - Test the date range filter
   - Export to CSV and verify the data

## Features

### Economic Group Management
- **Create new groups:** Click the button in the header, fill in name, description, and choose a color
- **Edit existing groups:** Click the edit icon next to any group in the management modal
- **Visual identification:** Each group has a unique color for easy recognition
- **Flexible categorization:** Users can create as many groups as needed for their farm

### Assignment Workflow
1. View the list of exported animals
2. For each animal, use the dropdown in the "Ekonominė grupė" column
3. Select a group from the list or leave as "Nepriskirta" (Unassigned)
4. The assignment is saved immediately
5. A colored badge appears showing the assigned group

### Reporting
- All exported animals with their economic groups are visible in the accounting module
- Filter by date range to see specific periods
- Export to CSV for external analysis
- See conflict status alongside economic group data

## Technical Notes

- The dropdown updates are saved immediately to the database
- The view `vw_animal_departures_with_conflicts` is optimized to join with the economic_groups table
- RLS policies ensure only authenticated users can manage economic groups
- The color picker uses standard hex color codes
- The system uses UUID foreign keys for data integrity
- All timestamps are tracked for audit purposes

## Future Enhancements (Optional)

Potential improvements that could be added later:
- Analytics by economic group (total value, count, trends)
- Bulk assignment of economic groups
- Import/export of group definitions
- Economic group templates for different farm types
- Financial tracking per economic group
- Soft delete functionality for inactive groups
