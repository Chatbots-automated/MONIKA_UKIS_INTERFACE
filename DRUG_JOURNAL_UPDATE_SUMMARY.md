# Veterinary Medicine Journal Update - 2024 Format

## Summary
Updated the VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS (Veterinary Medicine and Pharmaceutical Products Accounting Journal) to match the official 2024 format.

## Changes Made

### 1. Report Template Update (`src/components/ReportTemplates.tsx`)

**Old Format:**
- Single flat table with 10 columns
- All batches listed sequentially regardless of medicine
- Medicine name repeated for every batch

**New Format (2024):**
- Grouped by medicine/product
- Each medicine has a header section with:
  - **Veterinarinio vaisto / vaistinio preparato pavadinimas** (Medicine name)
  - **Pirminė pakuotė (mato vnt.)** (Primary package/unit)
  - Registration code and active substance displayed in header
- Simplified table with **7 columns** per medicine:
  1. **Gavimo data** - Receipt date
  2. **Dokumento, pagal kurį gautas vaistas, pavadinimas, numeris, data** - Document name, number, and date
  3. **Gautas kiekis** - Received quantity
  4. **Tinkamumo naudoti laikas** - Expiry date
  5. **Serija** - Batch/Serial number
  6. **Sunaudotas kiekis** - Used quantity
  7. **Likutis** - Remaining quantity

**Additional Features:**
- Summary row at the bottom of each medicine showing totals (received, used, remaining)
- Expired medicines highlighted in red
- Zero-stock items shown in gray
- Better visual grouping and readability
- Print-friendly with page break avoidance for medicine groups

### 2. Database View Update (`supabase/migrations/20260210000000_update_vet_drug_journal_view.sql`)

**Added Fields:**
- `doc_title` - Document title/name (was missing from the view)
- `lot` - Lot number (in addition to batch_number)

**Kept Fields:**
- All existing fields from the original view
- Calculation logic for `quantity_used` and `quantity_remaining` unchanged

**View Structure:**
```sql
SELECT 
  b.id AS batch_id,
  b.product_id,
  b.created_at AS receipt_date,
  p.name AS product_name,
  p.registration_code,
  p.active_substance,
  s.name AS supplier_name,
  b.lot,
  b.batch_number,
  b.mfg_date AS manufacture_date,
  b.expiry_date,
  b.received_qty AS quantity_received,
  p.primary_pack_unit AS unit,
  [quantity_used calculation],
  [quantity_remaining calculation],
  b.doc_title,          -- NEW
  b.doc_number AS invoice_number,
  b.doc_date AS invoice_date
FROM batches b
...
```

### 3. Print Styling Update (`src/index.css`)

Added `.page-break-inside-avoid` class to ensure medicine groups don't split across pages when printing.

## Data Source

The report pulls data from the `vw_vet_drug_journal` view which:
- Filters for medicines and prevention products (`category IN ('medicines', 'prevention')`)
- Joins `batches`, `products`, and `suppliers` tables
- Calculates used and remaining quantities from `usage_items` table
- Orders by receipt date (most recent first)

## How to Apply

### Step 1: Apply Database Migration
Run the SQL migration file in Supabase Dashboard SQL Editor:
```
supabase/migrations/20260210000000_update_vet_drug_journal_view.sql
```

This will update the view to include the `doc_title` field.

### Step 2: Test the Report
1. Navigate to the Ataskaitos (Reports) tab
2. Select "Veterinarinių vaistų žurnalas" (Drug Journal)
3. Apply filters if needed (date range, product, batch, etc.)
4. Generate the report
5. Verify the new format shows:
   - Medicines grouped together
   - Header with medicine name and unit
   - 7-column table per medicine
   - Summary totals per medicine

### Step 3: Print Test
1. Click the print button or use browser print (Ctrl+P / Cmd+P)
2. Verify that:
   - Medicine groups don't split across pages
   - Headers print correctly
   - Colors and formatting are preserved
   - Summary rows are visible

## Benefits of New Format

1. **Compliance**: Matches official 2024 Lithuanian veterinary medicine journal format
2. **Readability**: Easier to see all batches for a specific medicine
3. **Organization**: Natural grouping by product reduces confusion
4. **Totals**: Quick summary of received/used/remaining per medicine
5. **Professional**: Clean, structured format suitable for inspections

## Data Flow

```
batches table
    ↓
vw_vet_drug_journal view (with doc_title)
    ↓
Reports.tsx (filters & fetches data)
    ↓
DrugJournalReport component (groups by medicine)
    ↓
Rendered HTML report (print-ready)
```

## Notes

- The existing database schema didn't need any changes
- All existing filters (date, product, batch, invoice) still work
- The report is backwards compatible - old data displays correctly
- No changes to data entry or stock management workflows
