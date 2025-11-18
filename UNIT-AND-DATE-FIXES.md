# Unit and Date Format Fixes

## Changes Made

### 1. Date Input Format and Localization
- Added date input CSS styling in `index.css` for better calendar presentation
- Added `formatDateForInput` helper function in `helpers.ts` for yyyy-MM-dd format
- All date inputs now properly display in Lithuanian format

### 2. Product Measurement Units in Medicine Selection
**Location:** AnimalDetailSidebar.tsx - Gydymas section

**Before:**
- Always showed "ml" as the unit
- User had to manually select unit from dropdown

**After:**
- Automatically pulls `primary_pack_unit` from the selected product
- When you select a product (svirkstukas, bolusas, etc.), the unit field automatically updates to show the correct unit
- Unit field is now read-only and displays the product's actual measurement unit
- Code changes in lines 2968-2977: Automatically sets unit when product is selected
- Code changes in lines 3023-3025: Changed unit dropdown to read-only display

### 3. Measurement Units in Analytics (Gyvunu Registras)
**Location:** AnimalAnalytics.tsx component

**Database Migration:** `20251118110000_add_units_to_analytics.sql`
- Updated `vw_animal_product_usage` view to include `primary_pack_unit` from products
- Added `unit` field to ProductUsage interface
- Display now shows: "Kiekis: {quantity} {unit}"

**Example:** Instead of just "150", now shows "150 svirkstukas" or "20 bolusas"

### 4. Measurement Units in Veterinary Medicine Log (Veterinariniu Vaistu Zurnalas)
**Location:** Reports.tsx, ReportTemplates.tsx

**Already Working!**
- The `vw_vet_drug_journal` view already includes `p.primary_pack_unit as unit` (line 36 in migration 20251030120000)
- Column 2 in the report displays the unit correctly
- No changes needed - already properly connected

## Migrations to Apply

Apply these 2 migrations in Supabase Dashboard SQL Editor:

1. **20251118100000_update_teat_analytics_view.sql**
   - Updates teat analytics to use new JSONB sick_teats columns

2. **20251118110000_add_units_to_analytics.sql**
   - Adds unit field to animal product usage analytics

## Testing Checklist

- [ ] Create new treatment and select a product with unit "svirkstukas"
- [ ] Verify unit field automatically updates to "svirkstukas"
- [ ] Check Analytics page shows product quantities with correct units
- [ ] Check Veterinary Medicine Log report displays units in column 2
- [ ] Verify all date inputs use yyyy-MM-dd format
