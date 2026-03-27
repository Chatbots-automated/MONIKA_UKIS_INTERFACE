# Secretary System Integration - Quick Start Guide

## 🚀 Quick Setup (First Time)

### Step 1: Apply Database Migration

The migration creates all necessary tables for secretary system integration.

```bash
# If using local Supabase
supabase db reset

# Or apply migration directly
supabase migration up
```

### Step 2: Import Reference Data

Convert the XLS file to JSON and import into database:

```bash
# Convert Gratui.xls to JSON
python convert_xls_to_json.py

# Import into Supabase (option 1: using TypeScript)
npx tsx scripts/import_secretary_data.ts

# OR option 2: using SQL (after generating inserts)
psql -h YOUR_DB_HOST -U postgres -d postgres -f scripts/populate_secretary_tables.sql
```

### Step 3: Verify Data Import

Check that tables are populated:

```sql
SELECT COUNT(*) FROM secretary_materials;        -- Should be ~2929
SELECT COUNT(*) FROM secretary_services;         -- Should be ~1661
SELECT COUNT(*) FROM secretary_suppliers;        -- Should be ~2454
SELECT COUNT(*) FROM secretary_responsible_persons; -- Should be 11
SELECT COUNT(*) FROM secretary_accounting_operations; -- Should be 222
```

### Step 4: Configure N8N Sync (Optional)

1. Import workflow: `n8n/secretary_data_sync_workflow.json`
2. Configure credentials for secretary system API
3. Update OKSANA_INTERFACE webhook URL
4. Set schedule (recommended: every 6 hours)
5. Test workflow manually first

## 📋 Using the Export Feature

### For Secretaries

1. **Upload Invoice**
   - Go to "Technikos kiemas" → "Sąskaitos"
   - Upload PDF invoice
   - Review and confirm items

2. **Prepare for Export**
   - Click "Eksportuoti" button on the invoice
   - Modal opens with all required fields

3. **Fill Required Fields**

   **Tiekėjo informacija (Supplier)**:
   - Search for supplier by name
   - System auto-fills code, VAT code, address
   - Shows: L006 (code), L007 (name), L008 (currency)

   **Dokumento informacija (Document)**:
   - Branch number (L001) - usually "1"
   - Document series/number (L003 or L004)
   - Document type (L064) - usually "P" (normal)
   - Reverse VAT if applicable (L069)

   **For Each Line Item**:
   - Product code (L010) - auto-filled from system
   - Responsible person (L022-L023) - select from dropdown
   - Accounting operation (L028-L029) - select from dropdown
   - VAT rate (L016-L017) - usually 21%

4. **Preview & Export**
   - Click "Peržiūrėti JSON" to see complete payload
   - System validates all mandatory fields
   - If errors shown, fix them
   - Click "Eksportuoti" to save/send

5. **Download JSON** (if needed)
   - In preview modal, click "Atsisiųsti JSON"
   - Share with accounting team if needed

## 🔍 Field Reference

### Most Commonly Used Fields

| Field | Lithuanian | What to Enter | Example |
|-------|-----------|---------------|---------|
| L001 | Filialo numeris | Branch number | "1" |
| L006 | Tiekėjo kodas | Search supplier, select | "3293" |
| L007 | Tiekėjo pavadinimas | Auto-filled | "Hemessen 250 Essen" |
| L010 | Produkto kodas | Product SKU/code | "2802" |
| L022 | Atsakingas asmuo kodas | Select person | "3" |
| L023 | Atsakingas asmuo | Auto-filled | "Vadimas Kovalevskis" |
| L028 | Debetas | Select operation | "20007" |
| L029 | Kreditas | Auto-filled | "451" |

### When to Use Special Fields

**L069 (Reverse VAT)** - Use when:
- Buying from EU countries (code 1)
- Buying from foreign non-resident (code 2)
- Construction work (code 6)
- Metal scrap (code 7)
- Bankruptcy cases (code 8)

**L078-L081 (VAT Debtor/Creditor)** - Required for:
- Construction/renovation work
- Round wood purchases
- Metal scrap purchases

**L070 (Non-VAT Invoice)** - Check if:
- Supplier is not VAT payer
- Invoice explicitly states "Ne PVM sąskaita"

## 🔄 Daily Sync Process

### Automatic (N8N)

Once configured, n8n automatically:
1. Fetches latest data from secretary system (every 6 hours)
2. Converts to OKSANA format
3. Updates lookup tables
4. Logs sync results

### Manual Sync

If automatic sync fails or for testing:

```bash
# Re-export from secretary system to Gratui.xls
# Then run:
python convert_xls_to_json.py
npx tsx scripts/import_secretary_data.ts
```

## ⚠️ Important Rules

### Product Codes (SKU)

- **Must be unique** for each product
- **Must be consistent** across all invoices
- Same product = same code always
- Used for mapping in secretary system

### Supplier Codes

- Search by name, system provides code
- Code must exist in secretary_suppliers table
- If supplier not found, sync data first

### Responsible Persons

- Limited to 11 people in system
- Each has specific role/position
- Code must match secretary system exactly

### Accounting Operations

- 222 different operations available
- Each has specific debit/credit accounts
- Choose based on purchase type:
  - Feed: code 2 (debit 20001)
  - Seeds: code 37 (debit 20002)
  - Fertilizers: code 41 (debit 20003)
  - Plant protection: code 39 (debit 20004)
  - Medicines: code 6 (debit 20005)
  - Fuel: code 13 (debit 20006)
  - Spare parts: code 1 (debit 20007)
  - Construction materials: code 18 (debit 20008)

## 🐛 Troubleshooting

### "Trūksta tiekėjo kodo" (Missing supplier code)

**Solution**: 
1. Search for supplier in dropdown
2. If not found, check if data sync ran
3. Verify supplier exists in Gratui.xls
4. Run manual sync if needed

### "Trūksta produkto kodo" (Missing product code)

**Solution**:
1. Check if product has code in secretary_materials
2. Manually enter if not in system
3. Ensure code is unique

### "Trūksta materialiai atsakingo" (Missing responsible person)

**Solution**:
1. Select person from dropdown (L022-L023)
2. If person not in list, check secretary_responsible_persons table
3. Add person to secretary system first

### Empty Lookup Tables

**Solution**:
```bash
# Check if tables exist
supabase db reset

# Import data
python convert_xls_to_json.py
npx tsx scripts/import_secretary_data.ts

# Verify
# Check Supabase dashboard → Tables
```

### Export Validation Errors

**Solution**:
- Read error messages carefully
- Each error shows which field (L###) is missing
- Fill in all mandatory fields marked with *
- Preview JSON again to verify

## 📊 Monitoring

### Check Export Status

```sql
-- Recent exports
SELECT 
  invoice_id,
  export_status,
  exported_at,
  error_message
FROM secretary_invoice_exports
ORDER BY exported_at DESC
LIMIT 20;

-- Failed exports
SELECT * FROM secretary_invoice_exports
WHERE export_status = 'error';

-- Export success rate
SELECT 
  export_status,
  COUNT(*) as count
FROM secretary_invoice_exports
GROUP BY export_status;
```

### Check Sync Status

```sql
-- Last sync times
SELECT 
  'materials' as table_name,
  MAX(last_synced_at) as last_sync
FROM secretary_materials
UNION ALL
SELECT 
  'suppliers',
  MAX(last_synced_at)
FROM secretary_suppliers
UNION ALL
SELECT 
  'services',
  MAX(last_synced_at)
FROM secretary_services;
```

## 📞 Support

For technical issues:
1. Check this guide first
2. Review validation errors in UI
3. Check database tables
4. Verify n8n workflow status
5. Contact system administrator

For business logic questions:
1. Review SECRETARY_SYSTEM_INTEGRATION.md
2. Check Importas_struktūra(865).xls documentation
3. Contact accounting department
