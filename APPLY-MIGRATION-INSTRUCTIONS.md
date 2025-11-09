# Apply Package Tracking Migration

## Instructions

To complete the implementation of the enhanced stock reception and inventory management system, you need to apply the database migration.

### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Apply the Migration

1. Open the file: `supabase/migrations/20251109000000_add_package_tracking_and_units.sql`
2. Copy the entire contents of the file
3. Paste it into the SQL Editor
4. Click "Run" to execute the migration

### Step 3: Verify the Migration

The migration will:
- Add `package_size` and `package_count` columns to the `batches` table
- Create an automatic trigger to calculate `received_qty` when package fields are provided
- Add indexes for better query performance

### What's Been Implemented

1. **Database Schema**
   - New columns: `package_size`, `package_count` in batches table
   - Automatic calculation trigger for `received_qty`
   - Support for new unit types: `bolus`, `syringe` (in addition to existing units)
   - New product category: `vakcina` (vaccine)

2. **Stock Reception Form (ReceiveStock.tsx)**
   - Two new fields: "Pakuotės dydis" (package size) and "Kiek pakuočių" (package count)
   - Automatic calculation of total quantity (package_size × package_count)
   - Visual feedback showing the calculation
   - Backward compatible: can still enter quantity directly

3. **Products Component**
   - Added new unit types: `bolus`, `syringe`, `tablet`
   - Added new category: `vakcina`
   - All dropdowns updated with new options

4. **Vaccinations Component**
   - Now supports both "prevention" and "vakcina" categories
   - Products from both categories appear in vaccine selection

5. **Inventory Component**
   - Displays package information below total quantity
   - Shows: "3 pak. × 10ml" format when package data is available
   - Maintains full backward compatibility

6. **Treatment Component**
   - Already auto-sets unit based on product selection (no changes needed)
   - Supports all new unit types

## Example Usage

### Receiving Stock with Package Tracking

**Before:**
- Received Qty: 600ml

**After:**
- Pakuotės dydis (Package Size): 100ml (one bottle)
- Kiek pakuočių (Package Count): 6 (bottles)
- Viso kiekis (Total): 600ml (calculated automatically: 6 × 100 = 600)

### Inventory Display

**Before:**
- 600 ml

**After:**
- **600 ml**
- _6 pak. × 100 ml_

This makes it much easier to track physical inventory and understand what you actually have in stock!

## Future Cost Tracking

The system is now prepared for future per-animal cost tracking because:
- Each batch stores package information
- All usage items reference batch_id
- Cost per package can be calculated from purchase_price ÷ package_count
- Per-animal costs can be aggregated from usage_items linked to treatments

## Notes

- The system is backward compatible: if you don't enter package size/count, you can still enter total quantity directly
- Package tracking is optional but recommended for better inventory management
- The registration code field has been intentionally kept only in the products table (as per your requirements)
