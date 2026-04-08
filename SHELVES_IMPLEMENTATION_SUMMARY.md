# Stalažai (Shelves) System Implementation Summary

## Overview
Complete warehouse shelving system with compartments for organizing equipment and products. Supports categorization for tractor and heavy transport items.

## What Was Implemented

### 1. Database (Migration File)
**File**: `supabase/migrations/20260408000002_create_shelves_system.sql`

#### New Tables:
- **equipment_shelves**: Main shelves table
  - `shelf_number`: Unique identifier (e.g., "1", "2", "A")
  - `name`: Display name
  - `description`, `location`: Optional details
  
- **equipment_shelf_compartments**: Compartments within shelves
  - `shelf_id`: Foreign key to shelves
  - `compartment_code`: Code like "B2", "C3"
  - `vehicle_category`: Optional ('tractor' or 'heavy_transport')
  - `description`: What's stored here

#### Updated Tables:
- **equipment_invoice_item_assignments**
  - Added `compartment_id` column
  - Updated `assignment_type` constraint to include 'shelf'

#### New Views:
- `equipment_shelf_compartment_contents`: Shows all items in compartments
- `equipment_shelf_summary`: Statistics per shelf
- `equipment_compartment_summary`: Statistics per compartment

#### New Functions:
- `get_compartments_by_category(category_filter)`: Filter compartments by vehicle category

### 2. Stalažai Tab (New Component)
**File**: `src/components/technika/ShelvesManagement.tsx`

Features:
- Create/edit/delete shelves
- Create/edit/delete compartments within shelves
- Assign vehicle category to compartments (tractor/heavy_transport)
- View statistics (item count, total value) per shelf and compartment
- Search shelves
- Two-panel layout: shelves on left, compartments on right

### 3. Updated Assignment Modal (Sąskaitos Tab)
**File**: `src/components/technika/EquipmentInvoices.tsx`

Changes:
- Added new "Stalažui" button in assignment modal
- Shows all shelves with their compartments
- Compartments grouped by shelf
- Visual indicators for tractor (🚜) and heavy transport (🚛) compartments
- Click compartment to assign product to that shelf location

### 4. Updated Priskyrimas Report (Ataskaitos Tab)
**File**: `src/components/technika/TechnikaReports.tsx`

Changes:
- Added "Stalažai" button alongside "Darbuotojai" and "Transportas"
- Shows all compartments with assigned items
- Expandable view to see all products in each compartment
- Displays:
  - Shelf number and compartment code
  - Vehicle category badge (if assigned)
  - Item count and total value
  - Full product details with invoice numbers
  - Assignment history

### 5. Main Technika Component
**File**: `src/components/Technika.tsx`

Changes:
- Added "Stalažai" menu item with Layers icon
- Integrated ShelvesManagement component
- Positioned between "Kaupiniai" and "Įrankiai" in menu

## How It Works

### Workflow:
1. **Create Shelves** (Stalažai tab)
   - Go to Stalažai tab
   - Click "Pridėti stalažą"
   - Enter shelf number (e.g., "1"), name, location
   - Save

2. **Create Compartments** (Stalažai tab)
   - Select a shelf from the list
   - Click "Pridėti skyrių"
   - Enter compartment code (e.g., "B2", "C3")
   - Optionally select vehicle category (Traktorius/Sunkvežimis)
   - Add description (e.g., "Filtrai traktoriams")
   - Save

3. **Assign Products to Compartments** (Sąskaitos tab)
   - Upload invoice and add products to stock
   - In assignment modal, click "Stalažui" button
   - Select the appropriate compartment
   - Products are now stored in that shelf location

4. **View Shelf Contents** (Ataskaitos → Priskyrimas tab)
   - Go to Ataskaitos tab
   - Click "Priskyrimas" sub-tab
   - Click "Stalažai" button
   - See all compartments with items
   - Click to expand and see full details

## Key Features

### Compartment Categorization:
- Compartments can be marked for specific vehicle types
- Helps organize tractor parts separately from heavy transport parts
- Visual indicators (🚜/🚛) make it easy to identify

### Full Traceability:
- Every item shows its invoice number
- Assignment date and who assigned it
- Supplier information
- Product details and pricing

### Statistics:
- Total items per compartment
- Total value per compartment
- Total items per shelf
- Total value per shelf

## Database Schema

```
equipment_shelves
├── id (uuid)
├── shelf_number (text, unique)
├── name (text)
├── description (text)
├── location (text)
└── is_active (boolean)

equipment_shelf_compartments
├── id (uuid)
├── shelf_id (uuid) → equipment_shelves
├── compartment_code (text)
├── description (text)
├── vehicle_category (text: 'tractor' | 'heavy_transport')
├── notes (text)
└── is_active (boolean)

equipment_invoice_item_assignments
├── ... (existing columns)
└── compartment_id (uuid) → equipment_shelf_compartments
```

## To Apply:

1. Run the SQL migration:
   ```bash
   # Apply the migration file
   supabase db push
   ```
   Or manually apply: `supabase/migrations/20260408000002_create_shelves_system.sql`

2. The frontend changes are already in place and will work once the database is updated.

## Example Usage:

**Scenario**: Organizing tractor filters and heavy transport oil

1. Create Shelf "1" named "Pagrindinis stalažas"
2. Add compartment "B2" with category "Traktorius" and description "Filtrai"
3. Add compartment "C3" with category "Sunkvežimis" and description "Tepalai"
4. When uploading invoice with filters, assign to compartment B2
5. When uploading invoice with oil, assign to compartment C3
6. View organized inventory in Priskyrimas report

## Notes:
- Compartments are unique per shelf (can't have two "B2" in same shelf)
- Deleting a shelf/compartment sets `is_active = false` (soft delete)
- All assignment history is preserved
- Invoice numbers are displayed for easy tracking
