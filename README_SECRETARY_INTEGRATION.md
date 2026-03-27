# 🎯 Secretary System Integration - Complete Guide

## Overview

This integration connects OKSANA_INTERFACE with the secretary accounting system, enabling seamless invoice data export with strict L001-L084 field requirements.

## 🚀 Quick Start (3 Steps)

### Step 1: Apply Database Migration

```bash
# Make sure Docker Desktop is running
supabase start

# Apply migration
supabase db reset
```

This creates 7 new tables for secretary system integration.

### Step 2: Import Reference Data

**Option A - Using UI (Recommended)**:
1. Add `SecretaryDataImport` component to your admin panel
2. Navigate to the import page
3. Click "Importuoti duomenis"
4. Wait ~30-60 seconds
5. Verify counts: 2,929 materials, 2,454 suppliers, etc.

**Option B - Using Script**:
```bash
npx tsx scripts/import_secretary_data.ts
```

### Step 3: Test Export

1. Go to **Technikos kiemas** → **Sąskaitos**
2. Upload an invoice (or use existing)
3. Click **"Eksportuoti"** button
4. Fill in required fields
5. Click **"Peržiūrėti JSON"**
6. Verify output
7. Click **"Eksportuoti"**

## 📚 Documentation

### For Developers
- **[SECRETARY_INTEGRATION_SUMMARY.md](./SECRETARY_INTEGRATION_SUMMARY.md)** - Complete implementation details
- **[docs/SECRETARY_SYSTEM_INTEGRATION.md](./docs/SECRETARY_SYSTEM_INTEGRATION.md)** - Technical documentation
- **[docs/SECRETARY_VISUAL_OVERVIEW.md](./docs/SECRETARY_VISUAL_OVERVIEW.md)** - Visual diagrams and flows

### For Users
- **[docs/SECRETARY_QUICK_START.md](./docs/SECRETARY_QUICK_START.md)** - User guide for secretaries

## 🏗️ Architecture

### Database Tables

**Lookup Tables** (Synced daily/hourly):
- `secretary_materials` - 2,929 products with codes
- `secretary_services` - 1,661 services
- `secretary_suppliers` - 2,454 suppliers with codes
- `secretary_responsible_persons` - 11 people
- `secretary_accounting_operations` - 222 operations

**Invoice Tables** (Updated):
- `equipment_invoices` - Added 20+ L-fields
- `equipment_invoice_items` - Added 30+ L-fields

**Audit Table**:
- `secretary_invoice_exports` - Export log

### Components

- `SecretarySystemExport.tsx` - Main export modal
- `SecretaryDataImport.tsx` - Admin import tool
- `EquipmentInvoices.tsx` - Updated with export button

### Utilities

- `src/types/secretary-system.ts` - TypeScript types
- `src/utils/secretaryExport.ts` - Export functions
- `convert_xls_to_json.py` - Data converter

## 🎯 Key Features

### 1. Smart Supplier Search
- Type supplier name
- See dropdown with codes
- Select → auto-fills L006, L007, L008

### 2. Dropdown Lookups
- Responsible persons with codes
- Accounting operations with debit/credit
- Auto-fill related fields

### 3. Validation
- Real-time validation
- Clear error messages
- Shows which L-fields missing
- Prevents invalid exports

### 4. JSON Preview
- Syntax-highlighted display
- Complete L001-L084 structure
- Download option
- Validation status

### 5. Export Options
- Save to database (audit trail)
- Download JSON file
- (Future) Send to secretary API

## 📋 Field Reference

### Most Important Fields

| Field | Description | Example | How to Fill |
|-------|-------------|---------|-------------|
| L001 | Branch | "1" | Usually default |
| L006 | Supplier code | "3293" | Search by name |
| L010 | Product code | "2802" | From materials |
| L022 | Person code | "3" | Select from dropdown |
| L028 | Debit account | "20007" | Select operation |

### Field Formatting

- **Dates**: yyyymmdd (e.g., 20260326)
- **Quantities**: × 1000 (e.g., 2 → 2000)
- **Amounts**: × 100 (e.g., 150.00 → 15000)
- **VAT**: × 100 (e.g., 21% → 2100)

## 🔄 Data Sync

### Manual Sync (For Testing)

```bash
# 1. Get latest Gratui.xls from secretary system
# 2. Convert to JSON
python convert_xls_to_json.py

# 3. Import to database
npx tsx scripts/import_secretary_data.ts
```

### Automatic Sync (Production)

**Using N8N**:
1. Import workflow: `n8n/secretary_data_sync_workflow.json`
2. Configure secretary system API credentials
3. Set schedule (every 6 hours recommended)
4. Monitor sync status in logs

**Using Edge Function**:
- Endpoint: `supabase/functions/secretary-sync`
- Deploy: `supabase functions deploy secretary-sync`
- Call from n8n or external system

## 🐛 Troubleshooting

### Empty Lookup Tables

**Problem**: Dropdowns are empty, can't find suppliers

**Solution**:
```bash
# Check if data imported
supabase db reset
npx tsx scripts/import_secretary_data.ts

# Or use admin UI import tool
```

### "Trūksta tiekėjo kodo"

**Problem**: Can't find supplier in search

**Solution**:
1. Check if supplier in `secretary_suppliers` table
2. Run data sync
3. Verify supplier exists in Gratui.xls
4. Add manually if needed

### Validation Errors

**Problem**: Can't export, shows errors

**Solution**:
- Read error messages carefully
- Each error shows which L-field missing
- Fill all fields marked with red *
- Preview JSON again

### Build Errors

**Problem**: TypeScript errors

**Solution**:
```bash
npm run build
# Check for any errors
# All types are properly defined
```

## 📊 Monitoring

### Check Import Status

```sql
-- Verify data imported
SELECT 
  'materials' as table_name,
  COUNT(*) as count,
  MAX(last_synced_at) as last_sync
FROM secretary_materials
UNION ALL
SELECT 'suppliers', COUNT(*), MAX(last_synced_at)
FROM secretary_suppliers;
```

### Check Export Status

```sql
-- Recent exports
SELECT 
  ei.invoice_number,
  sei.export_status,
  sei.exported_at,
  u.full_name as exported_by
FROM secretary_invoice_exports sei
JOIN equipment_invoices ei ON ei.id = sei.invoice_id
LEFT JOIN users u ON u.id = sei.exported_by
ORDER BY sei.exported_at DESC
LIMIT 20;
```

## 🎉 Success Checklist

- [x] Database migration created
- [x] Lookup tables defined
- [x] TypeScript types created
- [x] Export utilities built
- [x] UI components created
- [x] Data converter script ready
- [x] Import scripts ready
- [x] N8N workflow template created
- [x] Documentation complete
- [x] Build succeeds with no errors
- [ ] Migration applied ← **YOU ARE HERE**
- [ ] Data imported
- [ ] Tested with real invoice
- [ ] Feedback gathered
- [ ] N8N sync configured

## 📞 Support

**Technical Issues**: Check documentation in `docs/` folder
**Business Logic**: Contact accounting department
**System Integration**: Review Importas_struktūra(865).xls

## 🎯 What's Next?

1. **Test the system** with a real invoice
2. **Verify JSON output** matches secretary requirements
3. **Gather feedback** from secretaries
4. **Setup N8N sync** for automatic updates
5. **Implement direct API** export (when ready)

---

**Status**: ✅ **READY FOR DEPLOYMENT**

All code complete. Ready for migration and testing.
