# Secretary System Integration

This document describes the integration between OKSANA_INTERFACE and the secretary accounting system.

## Overview

The secretary system requires strict data formatting for invoice imports. All purchase documents must follow the **Importas_struktūra(865)** format with fields L001-L084.

## Database Tables

### Reference Data Tables (Synced Daily/Hourly)

These tables store reference data from the secretary system:

1. **secretary_materials** - Materials/Products (Medžiagos)
   - 2,929 items
   - Contains: code, name, unit type, VAT rates, prices
   - Used for: L010 (product code), L011 (product name), L012 (unit type)

2. **secretary_services** - Services (Paslaugos)
   - 1,661 items
   - Contains: code, name
   - Used for: Service-based invoices

3. **secretary_suppliers** - Suppliers/Creditors (Tiekėjai)
   - 2,454 items
   - Contains: code, name, company code, VAT code, bank account
   - Used for: L006 (supplier code), L007 (supplier name), L008 (currency)

4. **secretary_responsible_persons** - Materially Responsible Persons (Atskaitingi asmenys)
   - 11 items
   - Contains: code, name, position
   - Used for: L022 (person code), L023 (person name)

5. **secretary_accounting_operations** - Accounting Operations (Ūkinės operacijos)
   - 222 items
   - Contains: code, name, debit, credit, expense structure
   - Used for: L028 (debit), L029 (credit), L030 (expense structure)

### Export Tables

1. **secretary_invoice_exports** - Export Log
   - Tracks all exports to secretary system
   - Stores complete JSON payload
   - Records export status and confirmation

## Field Mapping (L001-L084)

### Mandatory Header Fields

| Field | Name | Format | Source | Notes |
|-------|------|--------|--------|-------|
| L001 | Branch number | up to 4 digits | Config | Default: "1" |
| L002 | Document type | Fixed: "865" | Config | Purchase document |
| L003 | Document series + number | up to 15 chars | Invoice | Use if both series and number exist |
| L004 | Document number only | 1-7 digits | Invoice | Use if no series (L003 empty) |
| L005 | Document date | yyyymmdd | Invoice | Mandatory |
| L006 | Supplier unique code | up to 13 chars | secretary_suppliers.code | Mandatory - searchable by name |
| L007 | Supplier name | up to 45 chars | secretary_suppliers.name | Mandatory |
| L008 | Supplier currency | up to 3 chars | secretary_suppliers.currency | Mandatory, default: "EUR" |

### Mandatory Line Item Fields

| Field | Name | Format | Source | Notes |
|-------|------|--------|--------|-------|
| L009 | Product/Service flag | 0 or 1 | Auto | 0=product, 1=service (NOT user-fillable) |
| L010 | Product code | up to 20 chars | secretary_materials.code | UNIQUE product identifier |
| L011 | Product name | up to 35 chars | Item description | Mandatory |
| L012 | Unit of measure | up to 4 chars | secretary_materials.unit_type | Mandatory |
| L013 | Quantity/sum sign | 0 or 1 | User | 0=positive, 1=negative |
| L014 | Quantity * 1000 | integer | Calculated | Quantity multiplied by 1000 |
| L015 | Sum * 100 | integer | Calculated | Total price multiplied by 100 |
| L016 | VAT rate * 100 | integer or code | User/Material | e.g., 21% = 2100, or A/B/C/D codes |
| L017 | VAT sum * 100 | integer | Calculated | VAT amount multiplied by 100 |
| L022 | Responsible person code | up to 4 digits | secretary_responsible_persons.code | Mandatory |
| L023 | Responsible person name | up to 35 chars | secretary_responsible_persons.name | Mandatory |
| L028 | 1st accounting op debit | up to 9 chars | secretary_accounting_operations.debit | Mandatory |
| L029 | 1st accounting op credit | up to 9 chars | secretary_accounting_operations.credit | Mandatory, default: "451" |

### Optional Fields

| Field | Name | Format | Notes |
|-------|------|--------|-------|
| L018 | Receiving branch | up to 4 digits | Optional |
| L024-L025 | Structural unit | code + name | Optional |
| L026-L027 | Object | code + name | Optional |
| L030-L033 | 1st op expense/realization | codes + names | Optional |
| L034-L039 | 2nd accounting operation | debit, credit, expense | Optional |
| L064 | Document type | P/D/K/M | P=normal, D=debit, K=credit, M=margin |
| L069 | Reverse VAT indicator | 1-9, 99 | Special VAT scenarios |
| L070 | Non-VAT invoice | 1 | If not VAT invoice |
| L071-L072 | Bank accounts | 20 chars | Buyer and supplier accounts |
| L075 | Payment due date | yyyymmdd | Optional |
| L078-L081 | VAT debtor/creditor | codes + names | Required for construction/wood/metal |
| L082 | OSS system document | 1 | If OSS system |
| L083 | Contact email | up to 245 chars | Optional |
| L084 | OSS country code | 2 letters | Optional |

## Special Cases & Business Logic

### Reverse VAT Scenarios (L069)

1. **Code 1**: Purchases from other EU member states
2. **Code 2**: Purchases from foreign persons not established in Lithuania
3. **Code 3**: Goods acquired under VAT Law Article 33(1) Part 3
4. **Code 4**: Assets taken as capital contribution or due to reorganization
5. **Code 5**: Substantially improved buildings taken over
6. **Code 6**: Goods from Lithuanian producers (Wood, construction work)
7. **Code 7**: Goods from Lithuanian producers (Metal scrap)
8. **Code 8**: Goods from Lithuanian producers (Bankruptcy/restructuring)
9. **Code 9**: Import VAT controlled by VMI
10. **Code 99**: Sales (reverse VAT)

### VAT Special Codes (L016)

When VAT rate is 0, must specify:
- **A**: Non-taxable
- **B**: Zero rate
- **C**: Not VAT object
- **D**: No VAT

Or use format **XNNN** where:
- X = A, B, or C
- NNN = VAT code (0-9)

### Document Types (L064)

- **P**: Normal document (default)
- **D**: Debit document
- **K**: Credit document
- **M**: Margin

## N8N Webhook Endpoints

### 1. Daily/Hourly Data Sync

**Endpoint**: `POST /webhook/secretary-data-sync`

**Purpose**: Sync reference data from secretary system to OKSANA_INTERFACE

**Request Body**:
```json
{
  "sync_type": "full|incremental",
  "data_types": ["materials", "services", "suppliers", "responsible_persons", "accounting_operations"],
  "data": {
    "materials": [...],
    "services": [...],
    "suppliers": [...],
    "responsible_persons": [...],
    "accounting_operations": [...]
  }
}
```

**Response**:
```json
{
  "success": true,
  "synced_at": "2026-03-26T10:00:00Z",
  "counts": {
    "materials": 2929,
    "services": 1661,
    "suppliers": 2454,
    "responsible_persons": 11,
    "accounting_operations": 222
  }
}
```

**Implementation**:
- Run every hour or daily (configurable)
- Upsert data based on unique codes
- Update `last_synced_at` timestamp
- Mark old records as `is_active = false` if not in sync

### 2. Invoice Export to Secretary System

**Endpoint**: `POST /webhook/secretary-invoice-export`

**Purpose**: Send invoice data from OKSANA_INTERFACE to secretary system

**Request Body** (L001-L084 format):
```json
{
  "L001": "1",
  "L002": "865",
  "L003": "DOM0007982",
  "L005": "20260326",
  "L006": "3293",
  "L007": "Hemessen 250 Essen",
  "L008": "EUR",
  "items": [
    {
      "L009": 0,
      "L010": "2802",
      "L011": "Bass nugarinis akumuliatorinis",
      "L012": "vnt",
      "L013": 0,
      "L014": 2000,
      "L015": 15000,
      "L016": "2100",
      "L017": 3150,
      "L022": "3",
      "L023": "Vadimas Kovalevskis",
      "L028": "20007",
      "L029": "451"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "invoice_id": "uuid",
  "imported_at": "2026-03-26T10:00:00Z",
  "line_count": 5,
  "errors": []
}
```

## Data Flow

### 1. Invoice Upload Flow

```
1. Secretary uploads PDF invoice
2. PDF parsed by existing webhook
3. Invoice data displayed in UI
4. Secretary fills in required fields:
   - Searches for supplier by name → selects → gets code
   - Selects responsible person → gets code
   - Selects accounting operation → gets debit/credit
   - Reviews/edits product codes
5. Click "Peržiūrėti JSON" → validates all fields
6. Click "Eksportuoti" → generates L001-L084 payload
7. Payload saved to secretary_invoice_exports table
8. (Future) Payload sent to secretary system via webhook
```

### 2. Daily Sync Flow

```
1. N8N scheduled workflow runs (hourly/daily)
2. Fetches latest data from secretary system
3. Converts to JSON format
4. Sends to sync webhook
5. OKSANA_INTERFACE updates lookup tables
6. Old records marked as inactive
7. Sync timestamp updated
```

## UI Components

### SecretarySystemExport Component

Modal that appears when clicking "Eksportuoti" on an invoice.

**Features**:
- Supplier search with code display
- Responsible person dropdown
- Accounting operation selector
- VAT configuration
- Document type selection
- Reverse VAT scenarios
- JSON preview with validation
- Export to secretary system

**Validation**:
- All mandatory fields must be filled
- Field length limits enforced
- Proper formatting (dates, amounts)
- Shows clear error messages

## Testing

### Test Data Import

```bash
# Convert XLS to JSON
python convert_xls_to_json.py

# Import into Supabase
npm run import-secretary-data
# or
npx tsx scripts/import_secretary_data.ts
```

### Test Export

1. Create/upload an invoice
2. Click "Eksportuoti" button
3. Fill in required fields:
   - Search for supplier
   - Select responsible person
   - Select accounting operation
4. Click "Peržiūrėti JSON"
5. Verify all L001-L084 fields
6. Click "Eksportuoti"

## Important Notes

### SKU / Product Code (L010)

- Must be UNIQUE for each product
- Same product must always have same code across all invoices
- Used for mapping in secretary system
- Cannot have duplicate codes for different products

### Compliance

- Wrong data can cause serious issues with VMI (tax authority)
- Affects i_SAF forms and VAT declarations
- Always validate before exporting
- Keep audit trail in secretary_invoice_exports table

### Business Logic Complexity

The secretary system has ~30 different document variants:
- Foreign purchases
- Non-VAT payer purchases
- Construction work
- Bankrupt company purchases
- Electronics purchases
- Discount distribution
- Credit/debit invoices

**Current Implementation**: Start with simplest cases (normal purchases)
**Future**: Add support for complex scenarios as needed

## Maintenance

### Daily Sync Schedule

Recommended: Run sync every 6 hours or daily at specific time

```javascript
// N8N Cron Expression
// Every 6 hours: 0 */6 * * *
// Daily at 2 AM: 0 2 * * *
```

### Monitoring

Check `secretary_invoice_exports` table for:
- Failed exports (status = 'error')
- Pending exports (status = 'pending')
- Export frequency and patterns

### Data Quality

Regularly verify:
- Supplier codes match between systems
- Product codes are unique and consistent
- Responsible person codes are current
- Accounting operations are up to date

## API Reference

### Generate Export Payload

```typescript
import { generateSecretaryExportPayload } from '../utils/secretaryExport';

const payload = generateSecretaryExportPayload(invoice, items);
```

### Validate Payload

```typescript
import { validateSecretaryPayload } from '../utils/secretaryExport';

const validation = validateSecretaryPayload(payload);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Format for Display

```typescript
import { formatPayloadForDisplay } from '../utils/secretaryExport';

const jsonString = formatPayloadForDisplay(payload);
```

## Troubleshooting

### Common Issues

1. **"Trūksta tiekėjo kodo"**
   - Supplier not found in secretary_suppliers table
   - Run data sync or manually add supplier

2. **"Trūksta produkto kodo"**
   - Product code not filled in invoice item
   - Search for product in secretary_materials
   - Or manually enter unique code

3. **"Trūksta materialiai atsakingo"**
   - Responsible person not selected
   - Select from dropdown (L022-L023)

4. **"Trūksta ūkinės operacijos"**
   - Accounting operation not selected
   - Select from dropdown (L028-L029)

### Data Sync Issues

If lookup tables are empty:
1. Check if migration ran: `supabase db reset`
2. Import data: `npm run import-secretary-data`
3. Verify data: Check tables in Supabase dashboard

## Future Enhancements

1. **Automatic field population**
   - Auto-match suppliers by name/code
   - Auto-suggest accounting operations based on product category
   - Default responsible person based on user role

2. **Complex scenarios support**
   - Foreign purchase logic (L069 = 1, 2)
   - Construction work (L078-L081)
   - Tourism accounting (L040-L058)
   - Multiple accounting operations (L034-L039)

3. **Direct API integration**
   - Real-time export to secretary system
   - Confirmation webhooks
   - Error handling and retry logic

4. **Validation rules engine**
   - Business logic validation
   - Cross-field dependencies
   - Scenario-specific requirements

## Contact

For questions about secretary system integration, contact the accounting department or system administrator.
