# Stalažai (Shelves) Reorganization

## Overview
Moved the Stalažai (Shelves) functionality from a standalone menu item to a sub-tab under Sandėlis (Inventory) for better organization and logical grouping.

## Changes Made

### 1. Moved Stalažai to Sandėlis
**Before**: Stalažai was a separate menu item in the main Technika navigation
**After**: Stalažai is now the first tab under Sandėlis → Stalažai

### 2. Updated Navigation Structure
**File**: `src/components/technika/EquipmentInventory.tsx`

**New Tab Order in Sandėlis**:
1. **Stalažai** 🏭 - Manage shelves and compartments (NEW POSITION)
2. **Sandėlis** 📦 - Warehouse stock
3. **Išduotos prekės** 👥 - Items on loan
4. **Priimti atsargas** 📤 - Receive stock

**Changes**:
- Added `'shelves'` to the `Tab` type
- Imported `ShelvesManagement` component
- Added Warehouse icon import
- Added "Stalažai" tab button (placed first)
- Added tab content rendering: `{activeTab === 'shelves' && <ShelvesManagement />}`

### 3. Removed from Main Menu
**File**: `src/components/Technika.tsx`

**Changes**:
- Removed `ShelvesManagement` import
- Removed `Warehouse` icon import
- Removed `{ id: 'shelves', label: 'Stalažai', icon: Warehouse }` from menuItems
- Removed `case 'shelves': return <ShelvesManagement />;` from renderContent

## Benefits

### ✅ Better Organization
- Stalažai is logically grouped with inventory management
- All warehouse-related functions in one place
- Cleaner main navigation menu

### ✅ Improved User Flow
1. **Create shelves**: Go to Sandėlis → Stalažai
2. **Manage compartments**: Within Stalažai tab
3. **Assign items**: From Sąskaitos tab (assignment modal)
4. **View inventory**: Switch between Stalažai and Sandėlis tabs

### ✅ Consistent Structure
- Follows the pattern of grouping related functionality
- Similar to how Ataskaitos has multiple sub-tabs
- Reduces menu clutter

## How to Use

### Creating Shelves and Compartments:
1. **Navigate** to Technika → Sandėlis
2. **Click** "Stalažai" tab (first tab)
3. **Create shelves** with shelf numbers and names
4. **Add compartments** to each shelf
5. **Categorize** compartments (tractor/heavy transport)

### Assigning Items to Shelves:
1. **Navigate** to Technika → Sąskaitos
2. **Upload** an invoice
3. **Add to stock**
4. In **assignment modal**, click "Stalažui"
5. **Select** the appropriate compartment
6. Item is now stored in that shelf location

### Viewing Shelf Contents:
1. **Navigate** to Technika → Sandėlis → Stalažai
2. **Select** a shelf from the list
3. **View** compartments and their statistics
4. **See** item counts and total values

### Viewing in Reports:
1. **Navigate** to Technika → Ataskaitos → Priskyrimas
2. **Click** "Stalažai" button
3. **View** all compartments with assigned items
4. **Expand** to see detailed item information

## Files Modified

1. **`src/components/technika/EquipmentInventory.tsx`**
   - Added Stalažai tab
   - Integrated ShelvesManagement component
   - Updated Tab type

2. **`src/components/Technika.tsx`**
   - Removed Stalažai from main menu
   - Removed ShelvesManagement import
   - Cleaned up unused imports

## Navigation Path

**Old Path**: 
```
Technika → Stalažai
```

**New Path**:
```
Technika → Sandėlis → Stalažai (tab)
```

## UI Structure

### Sandėlis Component Tabs:
```
┌─────────────────────────────────────────────┐
│ [Stalažai] [Sandėlis] [Išduotos] [Priimti] │
├─────────────────────────────────────────────┤
│                                             │
│  Content based on selected tab              │
│                                             │
└─────────────────────────────────────────────┘
```

### Stalažai Tab Content:
```
┌──────────────────┬──────────────────┐
│  Stalažai List   │  Compartments    │
│                  │                  │
│  Shelf 1         │  B2 (Tractor)    │
│  Shelf 2         │  C3 (Heavy)      │
│  Shelf A         │  A1              │
│                  │                  │
└──────────────────┴──────────────────┘
```

## Integration Points

### 1. Assignment Modal (Sąskaitos Tab)
- "Stalažui" button still works
- Shows all shelves and compartments
- Assignment saves to database

### 2. Reports (Ataskaitos → Priskyrimas)
- "Stalažai" view still works
- Shows all compartments with items
- Displays assignment history

### 3. Database
- No database changes needed
- All existing migrations still valid
- Shelf and compartment data unchanged

## Testing Checklist

- [x] Navigate to Sandėlis → Stalažai tab
- [x] Verify ShelvesManagement component loads
- [x] Create a new shelf
- [x] Add compartments to shelf
- [x] Assign item from Sąskaitos tab to shelf
- [x] View assignment in Ataskaitos → Priskyrimas → Stalažai
- [x] Verify no errors in console
- [x] Confirm Stalažai removed from main menu
- [x] Check all other Sandėlis tabs still work

## Notes

- The ShelvesManagement component itself is unchanged
- All functionality remains the same
- Only the navigation structure changed
- This is a pure UI reorganization
- No database migrations needed
- Backward compatible with existing data

## Future Enhancements

Potential additions:
- Quick stats on Stalažai tab badge (item count)
- Direct link from Stalažai to Priskyrimas report
- Shelf capacity warnings
- Compartment utilization metrics
- Barcode scanning for shelf locations
