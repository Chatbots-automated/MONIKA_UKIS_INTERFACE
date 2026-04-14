# Write-Off Acts Improvements 📊

## Summary of Changes

### 1. ✅ Category Totals + Grand Total

Added a comprehensive summary section at the end of each expanded write-off act showing:
- **Category totals** - Sum for each category (Vaistai, Boliusai, etc.)
- **Grand total** - Total sum of all categories

#### Visual Design
- Blue gradient background box
- Clear separation between category totals and grand total
- Large, bold grand total display

#### Example Display:
```
┌─────────────────────────────────────┐
│  Bendra suvestinė                   │
├─────────────────────────────────────┤
│  Vaistai:              €10,450.00   │
│  Boliusai:             €2,340.50    │
│  Profilaktika:         €1,890.25    │
│  Higiena:              €560.00      │
│  Kitos išlaidos:       €3,200.00    │
├─────────────────────────────────────┤
│  VISO:                 €18,440.75   │
└─────────────────────────────────────┘
```

---

### 2. ✅ "Tiekėjo paslaugos" → "Kitos išlaidos" Mapping

Products with category "Tiekėjo paslaugos" (Supplier Services) now automatically appear under "Kitos išlaidos" (Other Expenses) in write-off acts.

#### How It Works:
1. **Invoice Upload**: When you upload an invoice with "Tiekėjo paslaugos" products (from either Veterinarija or Technika)
2. **Stock Addition**: When stock is added to inventory
3. **Write-Off Generation**: When you generate a write-off act, these products appear under "Kitos išlaidos"
4. **Module Preservation**: Products from Veterinarija stay in Veterinarija write-offs, Technika stays in Technika write-offs

#### Technical Implementation:
- Updated `translate_category_to_lithuanian()` function
- Maps both "Tiekėjo paslaugos" and "Supplier Services" → "Kitos išlaidos"
- Works for both manual and automatic write-off generation

---

### 3. ✅ Improved Stock Display (from previous fix)

Enhanced the "Likutis" (Remaining) column to show clear batch information:

#### Display Format:
```
Likutis:
54.00 vnt
  Gauta:              72.00
  Panaudota iš viso:  18.00
  ─────────────────────────
  Liko:               54.00
```

#### What Each Line Means:
- **Gauta**: Total received in this batch
- **Panaudota iš viso**: Total used from this batch (all time)
- **Liko**: Current remaining in this batch

---

## Files Modified

### 1. `src/components/WriteOffActs.tsx`
**Changes:**
- Added "Bendra suvestinė" (Grand Summary) section
- Category totals calculation
- Grand total display with styling
- Improved stock display with labels

**New Section:**
```tsx
{/* Grand Total Summary */}
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
  <h4 className="text-lg font-bold text-gray-900 mb-4">Bendra suvestinė</h4>
  
  {/* Category Totals */}
  {Object.entries(categoryTotals).map(([category, total]) => (
    <div key={category}>
      <span>{category}:</span>
      <span>€{total.toFixed(2)}</span>
    </div>
  ))}

  {/* Grand Total */}
  <div className="flex justify-between items-center pt-4 border-t-2">
    <span className="text-xl font-bold">VISO:</span>
    <span className="text-2xl font-bold text-blue-600">
      €{grandTotal.toFixed(2)}
    </span>
  </div>
</div>
```

### 2. `supabase/migrations/20260408000024_map_supplier_services_to_kitos_islaidos.sql`
**New Migration:**
- Updates `translate_category_to_lithuanian()` function
- Maps "Tiekėjo paslaugos" → "Kitos išlaidos"
- Handles both Lithuanian and English category names

**SQL Logic:**
```sql
CASE category_name
  WHEN 'Tiekėjo paslaugos' THEN RETURN 'Kitos išlaidos';
  WHEN 'Supplier Services' THEN RETURN 'Kitos išlaidos';
  -- ... other mappings
END CASE;
```

---

## Usage Examples

### Example 1: Veterinarija Write-Off Act

**Invoice uploaded to Veterinarija:**
- Vaistai: €5,000
- Boliusai: €1,200
- Tiekėjo paslaugos (vet consultation): €500

**Write-off act shows:**
```
Kategorijos:
├─ Vaistai: €5,000.00
├─ Boliusai: €1,200.00
└─ Kitos išlaidos: €500.00

Bendra suvestinė:
  Vaistai:          €5,000.00
  Boliusai:         €1,200.00
  Kitos išlaidos:   €500.00
  ─────────────────────────────
  VISO:             €6,700.00
```

### Example 2: Technika Write-Off Act

**Invoice uploaded to Technika:**
- Įranga: €3,000
- Tiekėjo paslaugos (repair service): €800

**Write-off act shows:**
```
Kategorijos:
├─ Įranga: €3,000.00
└─ Kitos išlaidos: €800.00

Bendra suvestinė:
  Įranga:           €3,000.00
  Kitos išlaidos:   €800.00
  ─────────────────────────────
  VISO:             €3,800.00
```

---

## Benefits

### 1. Better Financial Overview
- ✅ See category-wise spending at a glance
- ✅ Quickly verify total amounts
- ✅ Easy to spot discrepancies

### 2. Proper Categorization
- ✅ Service invoices go to correct category
- ✅ Consistent categorization across modules
- ✅ Clearer accounting records

### 3. Improved Clarity
- ✅ Batch information is clearly labeled
- ✅ Math is visible and verifiable
- ✅ No more "numbers out of nowhere"

---

## To Apply

1. **Apply the migration:**
   ```powershell
   cd c:\Projects\OKSANA_INTERFACE
   supabase db reset
   ```

2. **Test the features:**
   - Create a new write-off act
   - Expand it to see the summary section
   - Upload an invoice with "Tiekėjo paslaugos" products
   - Generate a write-off act and verify they appear under "Kitos išlaidos"

---

## Notes

- **Category totals** are calculated dynamically from act items
- **Grand total** matches the `total_amount` field in the database
- **Tiekėjo paslaugos** mapping works for both existing and new products
- **Module separation** is maintained (Vet products stay in Vet acts, Tech in Tech acts)

---

## Future Enhancements (Optional)

1. **Export with totals** - Include category totals in CSV/Excel exports
2. **Comparison view** - Compare totals across different periods
3. **Budget tracking** - Set limits per category and show warnings
4. **Visual charts** - Add pie chart showing category breakdown

---

## Summary

The write-off acts now provide:
- 📊 **Clear financial summary** with category and grand totals
- 🏷️ **Proper categorization** of supplier service invoices
- 📝 **Transparent calculations** with labeled batch information
- ✅ **Professional appearance** suitable for accounting reports

Perfect for financial reporting and auditing! 💼✨
