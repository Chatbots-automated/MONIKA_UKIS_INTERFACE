# Hoof System Fixes - 2026-05-06

## Issues Reported
1. "Būklė" (condition) dropdown is empty
2. "Išsaugoti visas (1)" button is not clickable  
3. Product info not loading
4. Batch/series loading needs improvement (duplicate entries with empty expiry dates)

## Root Causes Identified

### 1. Database Field Name Mismatch
**Problem**: Code was using `quantity_left` but database column is `qty_left`
- Affected stock deduction logic
- Affected batch filtering (showing all batches instead of only those with stock)

**Fix**: Updated all references from `quantity_left` to `qty_left` in:
- Stock deduction in `saveAllExaminations()` (line ~268, ~272)
- Batch filtering in product onChange handler (line ~781)
- Batch dropdown filtering and display (line ~814, ~821)

### 2. Missing Type Definition
**Problem**: `Batch` interface was missing several fields from database schema
- `qty_left: number | null`
- `batch_number: string | null`
- `status: string | null`
- `updated_at: string`

**Fix**: Updated `src/lib/types.ts` to include all fields from database

### 3. Batch Unit Display
**Problem**: Code tried to access `b.unit` but batches don't have a unit field
- Unit comes from the associated product's `primary_pack_unit`

**Fix**: Updated batch display to:
```tsx
const product = products.find(p => p.id === b.product_id);
`- Likutis: ${b.qty_left} ${product?.primary_pack_unit || ''}`
```

### 4. Missing Migration Data
**Problem**: Hoof condition codes might not be in the database
- The migration `20260506000001_add_hoof_zones.sql` should have inserted them
- But if migration wasn't run, the dropdowns will be empty

**Fix**: Added debug logging to identify missing data:
```tsx
console.log('📊 Data loaded:', {
  conditions: conditionsRes.data?.length || 0,
  products: productsRes.data?.length || 0,
  // ...
});
```

### 5. Save Button UX
**Problem**: Button disabled state wasn't clear to users

**Fix**: Added:
- Tooltip explaining why button is disabled
- Warning message below button showing specific requirement
- Better visual feedback

## Files Modified

1. **src/components/Hoofs3D.tsx**
   - Fixed field name: `quantity_left` → `qty_left` (multiple locations)
   - Fixed batch display to use product unit
   - Added debug logging for data loading
   - Added save button tooltips and warnings
   - Improved batch dropdown display

2. **src/lib/types.ts**
   - Added missing fields to `Batch` interface

## Migration Check

**IMPORTANT**: User should verify the migration was run:

```sql
-- Check if hoof condition codes exist
SELECT code, name_lt, is_active FROM hoof_condition_codes;

-- Should return rows like:
-- OK, Sveikas, true
-- WLD, Baltosios linijos liga, true
-- AF, Ašinė fisūra, true
-- etc.
```

If no rows are returned, run:
```bash
cd c:\Projects\OKSANA_INTERFACE
# The migration should already be in: supabase/migrations/20260506000001_add_hoof_zones.sql
```

## Testing Checklist

- [ ] Būklė dropdown shows condition codes (OK, WLD, AF, etc.)
- [ ] Products dropdown shows active products
- [ ] When product is selected, batches load automatically
- [ ] Batches show correct stock (qty_left) and unit from product
- [ ] No duplicate batches in dropdown
- [ ] Save button is clickable when animal + examinations are added
- [ ] Save button shows helpful message when disabled
- [ ] Stock deduction works correctly (qty_left decreases)

## Batch Dropdown Improvements

The improved batch display now shows:
- Batch lot number (or shortened ID if lot is null)
- Stock level with correct unit from product
- Expiry date (only if it exists)
- Cleaner formatting with conditional display

Example:
```
LOT12345 - Likutis: 150 ml (galioja iki: 2026-12-31)
Partija abc123de - Likutis: 50 g
```

## Next Steps

1. Check browser console for the debug logs
2. Verify data exists in database tables
3. Test the complete workflow: select animal → add examination → save
4. Monitor stock deduction in batches table
