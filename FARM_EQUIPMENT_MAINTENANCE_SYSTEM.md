# Farm Equipment Maintenance System - Complete Guide

## Overview

The **Fermos įrangos aptarnavimai** (Farm Equipment Maintenance) system allows you to track and manage maintenance schedules for farm equipment and systems like carousels, milking systems, feeding systems, etc.

## Features

### 1. Hierarchical Equipment Structure
- **Main Equipment** (e.g., "Karuselė", "Melžimo sistema")
  - Each equipment can have multiple **Components/Items** (e.g., "Filtrai", "Paklotas", "Šepečiai")
  - Components are tracked individually with their own service schedules

### 2. Automated Service Scheduling
- Set service intervals for each component (days, weeks, months, or years)
- Automatic calculation of next service date
- Reminder system (e.g., 2 weeks before service due)
- Visual status indicators:
  - 🔴 **Vėluoja** (Overdue) - Service is past due
  - 🟡 **Artėja** (Upcoming) - Service due within reminder period
  - 🟢 **Gerai** (OK) - Service not due soon
  - ⚪ **Nesuplanuota** (Not Scheduled) - No service date set

### 3. Service Recording
- Log when maintenance is performed
- Automatically updates last service date
- Automatically calculates next service date
- Track notes about what was done
- (Future: Link parts/products used during service)

## Database Schema

### Tables Created

#### `farm_equipment`
Main equipment/systems table:
- `id` - UUID primary key
- `name` - Equipment name (e.g., "Karuselė")
- `description` - Optional description
- `location` - Where on farm (e.g., "Tvartas 1")
- `category` - Category (Melžimas, Šėrimas, Valymas, etc.)
- `is_active` - Active status
- Timestamps and user tracking

#### `farm_equipment_items`
Components within each equipment:
- `id` - UUID primary key
- `farm_equipment_id` - Foreign key to parent equipment
- `item_name` - Component name (e.g., "Filtrai")
- `description` - Optional description
- `service_interval_value` - Interval number (e.g., 3)
- `service_interval_type` - Type (days/weeks/months/years)
- `reminder_days_before` - Days before to remind (default 14)
- `last_service_date` - When last serviced
- `next_service_date` - Auto-calculated next service date
- `is_active` - Active status
- `notes` - Additional notes
- Timestamps and user tracking

#### `farm_equipment_service_records`
Service history logs:
- `id` - UUID primary key
- `farm_equipment_item_id` - Foreign key to item
- `service_date` - When service was performed
- `performed_by` - User who performed service
- `notes` - Service notes
- Timestamps

#### `farm_equipment_service_parts` (Future Use)
Junction table for linking service records to parts used:
- Links service records to equipment invoice items
- Tracks quantity used
- Allows full parts consumption tracking

### Views Created

#### `farm_equipment_summary`
Aggregated view of equipment with:
- Total items count
- Active items count
- Overdue items count
- Upcoming items count
- Next service due date

#### `farm_equipment_items_detail`
Detailed view of items with:
- Equipment information
- Service status calculation
- Days until service
- Service count

### Triggers

1. **Auto-calculate next service date**
   - Triggers when `last_service_date` or interval changes
   - Uses `calculate_next_service_date()` function

2. **Auto-update last service date**
   - Triggers when new service record is created
   - Updates the item's last service date

## How to Use

### Step 1: Apply Database Migration

Run the migration in Supabase SQL Editor:

```bash
# Migration file:
supabase/migrations/20240206000000_farm_equipment_maintenance_system.sql
```

Or copy/paste the SQL directly into Supabase Dashboard → SQL Editor.

### Step 2: Access the System

1. Navigate to **Technika** module
2. Click on **"Fermos įrangos aptarnavimai"** in the sidebar

### Step 3: Create Equipment

1. Click **"Nauja įranga"** button
2. Fill in:
   - **Pavadinimas** (Name): e.g., "Karuselė", "Melžimo sistema"
   - **Aprašymas** (Description): Optional details
   - **Kategorija** (Category): Select from predefined categories
   - **Vieta** (Location): Where on the farm
3. Click **"Sukurti"**

### Step 4: Add Components

1. Click on an equipment item to expand it
2. Click **"Pridėti komponentą"**
3. Fill in:
   - **Komponento pavadinimas**: e.g., "Filtrai", "Paklotas"
   - **Aprašymas**: Optional description
   - **Aptarnavimo intervalas**: e.g., "3 Mėnesių"
   - **Priminimas prieš**: e.g., "14" days
   - **Paskutinis aptarnavimas**: When it was last serviced
   - **Pastabos**: Additional notes
4. Click **"Sukurti"**

The system will automatically calculate the next service date!

### Step 5: Record Service

When you perform maintenance:

1. Click **"Aptarnavimas"** button on the component
2. Enter:
   - **Aptarnavimo data**: Date service was performed
   - **Pastabos**: What was done, parts replaced, etc.
3. Click **"Registruoti"**

The system will:
- Update the last service date
- Recalculate the next service date
- Update the service status

## Example Scenarios

### Scenario 1: Carousel Maintenance

1. Create equipment: **"Karuselė"**
   - Location: "Tvartas 1"
   - Category: "Melžimas"

2. Add components:
   - **Filtrai**
     - Interval: 3 months
     - Last service: 2024-01-15
     - Next service: Auto-calculated to 2024-04-15
     - Status: Shows "Artėja" 2 weeks before
   
   - **Paklotas**
     - Interval: 6 months
     - Last service: 2024-01-01
     - Next service: 2024-07-01

3. When you service the filters on 2024-04-15:
   - Click "Aptarnavimas"
   - Enter date and notes
   - System updates next service to 2024-07-15

### Scenario 2: Milking System

1. Create equipment: **"Melžimo sistema"**
   - Location: "Melžykla"
   - Category: "Melžimas"

2. Add components:
   - **Šepečiai** (Scrubbers) - Every 2 months
   - **Žarnelės** (Hoses) - Every 6 months
   - **Siurbliai** (Pumps) - Every 12 months
   - **Jutikliai** (Sensors) - Every 3 months
   - **Filtrai** (Filters) - Every 1 month

## UI Features

### Equipment Card
- Shows equipment name, category, location
- Statistics: Total components, overdue, upcoming, next service
- Expandable to show components
- Edit/Delete buttons

### Component Display
- Component name and status badge
- Service interval and dates
- Days until next service
- Service button for quick access
- Edit/Delete buttons

### Visual Indicators
- Color-coded status badges
- Overdue items highlighted in red
- Upcoming items in yellow
- OK items in green

## Future Enhancements

1. **Parts Tracking** (Partially built)
   - Link service records to invoice items
   - Track parts consumption
   - Cost analysis per equipment

2. **Reminders** (Mentioned by user)
   - Email/notification system
   - Automated reminders based on `reminder_days_before`
   - Dashboard alerts for overdue items

3. **Service History**
   - View all past services for a component
   - Service frequency analytics
   - Cost trends

4. **Calendar View**
   - See all upcoming services on a calendar
   - Plan maintenance schedules

5. **Mobile App**
   - Record services from mobile device
   - Push notifications for reminders

## Files Changed/Created

### Database
- ✅ `supabase/migrations/20240206000000_farm_equipment_maintenance_system.sql`

### Frontend
- ✅ `src/components/technika/FarmEquipmentMaintenance.tsx` (NEW)
- ✅ `src/components/Technika.tsx` (Updated - added new tab)
- ✅ `src/components/technika/MaintenanceSchedules.tsx` (Renamed title)

## Testing Checklist

- [x] Create new equipment
- [x] Edit equipment
- [x] Delete equipment (only if no components)
- [x] Add components to equipment
- [x] Edit components
- [x] Delete components
- [x] Automatic next service date calculation
- [x] Record service (updates last service date)
- [x] Status indicators (overdue/upcoming/ok)
- [x] Expand/collapse equipment
- [x] Visual statistics on equipment cards
- [x] No linting errors
- [x] All RLS policies in place

## Migration Application

To apply the database migration:

**Option 1: Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/20240206000000_farm_equipment_maintenance_system.sql`
4. Paste and click **Run**

**Option 2: Command Line**
```bash
psql "your-connection-string" -f supabase/migrations/20240206000000_farm_equipment_maintenance_system.sql
```

## Support

For issues or questions:
1. Check the database migration was applied successfully
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Review the views are created: `farm_equipment_summary`, `farm_equipment_items_detail`

---

**Status:** ✅ Complete and ready for use!

Apply the migration, refresh your browser, and navigate to **Technika** → **Fermos įrangos aptarnavimai** to start managing your farm equipment maintenance! 🚜✨
