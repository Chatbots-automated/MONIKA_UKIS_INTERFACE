# Technika Module Enhancement - Technikos Kiemas

## Overview
This document describes the changes made to transform the technika module into "technikos kiemas" with enhanced assignment capabilities for workers and vehicles.

## Database Changes (SQL Migration)

### File: `supabase/migrations/20260408000001_enhance_technika_assignments.sql`

#### 1. Vehicle Category Classification
- **Added column**: `vehicle_category` to `vehicles` table
- **Values**: 
  - `'tractor'` - for tractors
  - `'heavy_transport'` - for heavy transport vehicles (sunkvezimiai)
  - `NULL` - for other vehicles
- **Purpose**: Allows filtering vehicles by category when assigning products

#### 2. Worker Assignments
- **Added column**: `worker_id` to `equipment_invoice_item_assignments` table
- **References**: `users(id)` table
- **Purpose**: Enables direct assignment of products/equipment to workers

#### 3. Updated Assignment Types
- **Added**: `'worker'` to the assignment_type constraint
- **Full list of assignment types**:
  - `vehicle` - Assign to vehicle
  - `worker` - Assign to worker (NEW)
  - `tool` - Assign to tool/equipment
  - `building` - Assign to building
  - `general_farm` - General farm assignment
  - `cost_center` - Assign to cost center
  - `transport_service` - Transport service expense

#### 4. New Database Views

##### `worker_equipment_assignments`
Shows all equipment/products assigned to workers with full details including:
- Worker information (name, email)
- Invoice details
- Product information
- Assignment notes and dates

##### `vehicle_equipment_assignments`
Shows all equipment/products assigned to vehicles with:
- Vehicle information (registration, type, category)
- Invoice details
- Product information
- Assignment notes and dates

##### `worker_assignment_summary`
Provides summary statistics per worker:
- Total assignments
- Unique products
- Total cost
- Last assignment date

##### `vehicle_assignment_summary`
Provides summary statistics per vehicle:
- Total assignments
- Unique products
- Total cost
- Last assignment date
- Vehicle category

##### `equipment_unassigned_invoice_items` (Updated)
Shows invoice items not yet assigned to any category

#### 5. Helper Function

##### `get_vehicles_by_category(category_filter)`
- **Parameters**: `category_filter` (optional) - 'tractor' or 'heavy_transport'
- **Returns**: Filtered list of vehicles with assignee information
- **Usage**: 
  ```sql
  SELECT * FROM get_vehicles_by_category('tractor');
  SELECT * FROM get_vehicles_by_category('heavy_transport');
  SELECT * FROM get_vehicles_by_category(NULL); -- All vehicles
  ```

## Frontend Changes

### 1. VehiclesManagement Component (`src/components/technika/VehiclesManagement.tsx`)

#### Changes:
- Added `vehicle_category` field to Vehicle interface
- Added `vehicle_category` field to VehicleForm interface
- Updated vehicle form to include category selection
- Auto-populate category based on vehicle type:
  - `tractor` → `'tractor'`
  - `truck`, `semi_trailer` → `'heavy_transport'`
  - Others → empty

#### UI Changes:
- New dropdown in vehicle form: "Kategorija (Technikos kiemas)"
- Options:
  - Nenurodyta (Not specified)
  - Traktorius (Tractor)
  - Sunkvežimis - Heavy Transport

### 2. EquipmentInvoices Component (`src/components/technika/EquipmentInvoices.tsx`)

#### State Changes:
- Added `workers` state - list of all active users
- Added `vehicles` state - list of all active vehicles
- Added `workerId` to assignmentForm state

#### Data Loading:
- Now loads workers from `users` table
- Now loads vehicles with category information

#### Assignment Modal Changes:

##### New Section: "Priskirti darbuotojui arba transportui"
- **Worker Assignment Button**: Assign to worker
- **Vehicle Assignment Button**: Assign to vehicle (tractor or heavy transport)

##### Worker Selection:
- Dropdown showing all active workers
- Displays: Full name (Email)

##### Vehicle Selection (with categories):
When "Vehicle" assignment type is selected, shows separate sections:

1. **Traktoriai (Tractors)**
   - Lists all vehicles with `vehicle_category = 'tractor'`
   - Shows: Registration - Make Model

2. **Sunkvežimiai (Heavy Transport)**
   - Lists all vehicles with `vehicle_category = 'heavy_transport'`
   - Shows: Registration - Make Model

3. **Kiti transportai (Other Vehicles)**
   - Lists vehicles without category
   - Shows: Registration - Make Model (Type)

#### Validation:
- Worker assignment requires worker selection
- Vehicle assignment requires vehicle selection
- Existing validations remain for other assignment types

## How to Use

### 1. Apply the Migration
```bash
# The SQL file is ready in:
# supabase/migrations/20260408000001_enhance_technika_assignments.sql

# Apply it using your preferred method:
# - Supabase CLI
# - Supabase Dashboard
# - Direct SQL execution
```

### 2. Update Existing Vehicles (Optional)
After migration, you may want to categorize existing vehicles:
```sql
-- Categorize existing tractors
UPDATE vehicles 
SET vehicle_category = 'tractor' 
WHERE vehicle_type = 'tractor';

-- Categorize existing heavy transport
UPDATE vehicles 
SET vehicle_category = 'heavy_transport' 
WHERE vehicle_type IN ('truck', 'semi_trailer');
```

### 3. Create New Vehicles
When creating vehicles in the Transportas tab:
1. Select vehicle type (Traktorius or Sunkvežimis)
2. Category will auto-populate
3. You can manually adjust the category if needed

### 4. Assign Products to Workers or Vehicles

#### In Sąskaitos Tab:
1. Upload invoice PDF
2. Match products
3. Confirm invoice
4. **Assignment Modal Opens Automatically**
5. Choose assignment type:
   - **Darbuotojui** (To Worker) - for personal equipment, tools, PPE
   - **Transportui** (To Vehicle) - for vehicle parts, maintenance items
   - Other existing types (Tool, Building, Cost Center, etc.)

#### For Worker Assignment:
1. Click "Darbuotojui" button
2. Select worker from dropdown
3. Add notes (optional)
4. Click "Priskirti" (Assign)

#### For Vehicle Assignment:
1. Click "Transportui" button
2. Select from appropriate section:
   - **Traktoriai** - for tractor parts
   - **Sunkvežimiai** - for heavy transport parts
   - **Kiti transportai** - for other vehicles
3. Add notes (optional)
4. Click "Priskirti" (Assign)

## Reporting & Analytics

### Query Worker Assignments:
```sql
-- All assignments for a specific worker
SELECT * FROM worker_equipment_assignments 
WHERE worker_id = 'worker-uuid';

-- Summary of all workers with assignments
SELECT * FROM worker_assignment_summary;
```

### Query Vehicle Assignments:
```sql
-- All assignments for a specific vehicle
SELECT * FROM vehicle_equipment_assignments 
WHERE vehicle_id = 'vehicle-uuid';

-- All tractor assignments
SELECT * FROM vehicle_equipment_assignments 
WHERE vehicle_category = 'tractor';

-- All heavy transport assignments
SELECT * FROM vehicle_equipment_assignments 
WHERE vehicle_category = 'heavy_transport';

-- Summary of all vehicles with assignments
SELECT * FROM vehicle_assignment_summary;
```

### Query Unassigned Items:
```sql
SELECT * FROM equipment_unassigned_invoice_items;
```

## Benefits

### 1. Worker Tracking
- Track personal equipment issued to workers
- Monitor PPE distribution
- Analyze per-worker equipment costs

### 2. Vehicle Categorization
- Separate tractor maintenance costs from heavy transport
- Better fleet management
- Category-specific reporting

### 3. Improved Assignment Flow
- Clear separation between worker and vehicle assignments
- Organized vehicle selection by category
- Faster assignment process

### 4. Better Reporting
- Dedicated views for worker and vehicle assignments
- Summary statistics for cost analysis
- Easy filtering by category

## Testing Checklist

- [ ] Apply SQL migration successfully
- [ ] Create new vehicle with category
- [ ] Edit existing vehicle and set category
- [ ] Upload invoice in Sąskaitos tab
- [ ] Assign product to worker
- [ ] Assign product to tractor
- [ ] Assign product to heavy transport vehicle
- [ ] Verify assignment appears in database views
- [ ] Check unassigned items view
- [ ] Test worker assignment summary
- [ ] Test vehicle assignment summary

## Notes

- The migration is backward compatible
- Existing assignments remain unchanged
- Vehicles without categories can still be used
- All existing assignment types continue to work
- The UI gracefully handles vehicles without categories
