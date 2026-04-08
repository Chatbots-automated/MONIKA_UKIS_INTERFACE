# Secretary and Warehouse Manager Roles Implementation

## Overview
Added two new roles with full Technika module access and special permissions for invoice management and export functionality.

## New Roles

### 1. Buhalterė (Secretary) - `buhaltere`
**Color**: Pink badge
**Icon**: Mail icon
**Permissions**:
- ✅ Full access to Technika module
- ✅ Can view ALL invoices (no 20-item limit)
- ✅ Can see where all items were assigned (worker/transport/cost center/shelf)
- ✅ **EXCLUSIVE access** to Eksportuoti (Export) section with L0 fields
- ✅ Can export single invoices
- ✅ Can bulk export multiple invoices

### 2. Sandėlininkas (Warehouse Manager) - `sandelininkas`
**Color**: Indigo badge
**Icon**: Warehouse icon
**Permissions**:
- ✅ Full access to Technika module
- ✅ Can view ALL invoices (no 20-item limit)
- ✅ Can upload invoices
- ✅ Can assign items to workers, vehicles, cost centers, shelves
- ✅ Can see where all items were assigned
- ❌ Cannot access Eksportuoti section (secretary only)

### 3. Admin
**Permissions**:
- ✅ Can see and do EVERYTHING
- ✅ Full access to all modules
- ✅ Can export invoices

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20260408000003_add_secretary_warehouse_manager_roles.sql`

- Updated `users` table role constraint to include:
  - `'buhaltere'::text`
  - `'sandelininkas'::text`

### 2. TypeScript Type Updates
**File**: `src/contexts/AuthContext.tsx`

```typescript
export type UserRole = 'admin' | 'vet' | 'tech' | 'viewer' | 
  'farm_worker' | 'warehouse_worker' | 
  'buhaltere' | 'sandelininkas' | 'custom';
```

### 3. User Management UI
**File**: `src/components/UserManagement.tsx`

**Added to dropdown**:
```html
<optgroup label="Technikos modulis">
  <option value="farm_worker">Fermos darbuotojas</option>
  <option value="warehouse_worker">Technikos kiemo darbuotojas</option>
  <option value="sandelininkas">Sandėlininkas (Warehouse Manager)</option>
  <option value="buhaltere">Buhalterė (Secretary)</option>
</optgroup>
```

**Added role icons, colors, and labels**:
- `getRoleIcon()` - Mail icon for secretary, Warehouse icon for warehouse manager
- `getRoleColor()` - Pink for secretary, Indigo for warehouse manager
- `getRoleLabel()` - Lithuanian labels

### 4. Equipment Invoices Component
**File**: `src/components/technika/EquipmentInvoices.tsx`

#### Invoice Loading Logic
```typescript
// Secretary and warehouse manager can see ALL invoices, others see limited
const canSeeAllInvoices = user?.role === 'admin' || 
                          user?.role === 'buhaltere' || 
                          user?.role === 'sandelininkas';
const invoiceLimit = canSeeAllInvoices ? 1000 : 20;
```

#### Export Button Visibility
- **Single invoice export button**: Only visible to `admin` and `buhaltere`
- **Bulk export button**: Only visible to `admin` and `buhaltere`
- **Invoice selection checkboxes**: Only visible to `admin` and `buhaltere`

```typescript
{(user?.role === 'admin' || user?.role === 'buhaltere') && (
  <button onClick={() => setShowSecretaryExport(true)}>
    Eksportuoti
  </button>
)}
```

## How It Works

### For Secretary (Buhalterė):
1. **Login** with secretary role
2. **Navigate** to Technika → Sąskaitos
3. **See ALL invoices** (not just 20)
4. **View assignments**: Click on any invoice to see where items were assigned
5. **Export invoices**:
   - Check boxes next to invoices
   - Click "Eksportuoti X sąskaitas" for bulk export
   - Or click "Eksportuoti" on individual invoice
6. **Fill L0 fields** in export modal (secretary-only feature)

### For Warehouse Manager (Sandėlininkas):
1. **Login** with warehouse manager role
2. **Navigate** to Technika → Sąskaitos
3. **See ALL invoices** (not just 20)
4. **Upload new invoices**
5. **Assign items** to:
   - Workers (Darbuotojui)
   - Vehicles (Transportui) - with tractor/heavy transport categories
   - Cost Centers (Kaštų centrui)
   - Shelves (Stalažui) - if working
6. **View assignments**: See where all items were assigned
7. **Cannot export**: Export buttons are hidden

### For Admin:
1. **Full access** to everything
2. **Can export** invoices like secretary
3. **Can manage** all aspects of the system

## Database Schema

```sql
-- Users table role constraint
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role = ANY (ARRAY[
    'admin'::text,
    'vet'::text,
    'tech'::text,
    'viewer'::text,
    'farm_worker'::text,
    'warehouse_worker'::text,
    'sandelininkas'::text,  -- NEW
    'buhaltere'::text,      -- NEW
    'custom'::text
  ]));
```

## To Apply

### 1. Run Database Migration
```bash
cd c:\Projects\OKSANA_INTERFACE
supabase db push
```

Or manually apply:
```sql
-- Run the contents of:
supabase/migrations/20260408000003_add_secretary_warehouse_manager_roles.sql
```

### 2. Create Users
1. Go to **Admin** → **Vartotojų Valdymas**
2. Click **"Pridėti naują vartotoją"**
3. Select role:
   - **Buhalterė (Secretary)** - for accounting/export staff
   - **Sandėlininkas (Warehouse Manager)** - for warehouse staff
4. Fill in details and save

### 3. Test Permissions
**As Secretary**:
- ✅ Can see all invoices
- ✅ Can export invoices
- ✅ Can see L0 fields in export modal
- ❌ Cannot upload invoices (warehouse manager task)

**As Warehouse Manager**:
- ✅ Can see all invoices
- ✅ Can upload and assign items
- ✅ Can view all assignments
- ❌ Cannot see export buttons

**As Admin**:
- ✅ Can do everything

## UI Indicators

### Role Badges
- **Admin**: Red badge with Shield icon
- **Buhalterė**: Pink badge with Mail icon
- **Sandėlininkas**: Indigo badge with Warehouse icon

### Invoice List
- **Secretary/Admin**: See checkboxes and export buttons
- **Warehouse Manager**: No checkboxes, no export buttons
- **All roles**: Can see invoice details and assignments

## Notes

- Both new roles have **full Technika module access**
- Invoice limit increased from 20 to 1000 for privileged roles
- Export functionality is **secretary-exclusive** (plus admin)
- Warehouse manager focuses on **operational tasks** (upload, assign)
- Secretary focuses on **administrative tasks** (view, export, reporting)
- All assignment history is visible to both roles for transparency

## Future Enhancements

Potential additions:
- Custom date range filters for invoice viewing
- Export templates for different accounting systems
- Audit logs for secretary exports
- Warehouse manager-specific reports
- Role-based dashboard widgets
