# Secretary System Integration - Visual Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OKSANA_INTERFACE                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Technikos kiemas → Sąskaitos                          │    │
│  │                                                         │    │
│  │  1. Upload PDF Invoice                                 │    │
│  │     ↓                                                   │    │
│  │  2. Parse with existing webhook                        │    │
│  │     ↓                                                   │    │
│  │  3. Review & Confirm                                   │    │
│  │     ↓                                                   │    │
│  │  4. Click "Eksportuoti" ← NEW!                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  SecretarySystemExport Modal                           │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ Supplier Search (by name)                       │  │    │
│  │  │ → Shows: Code, Company Code, VAT Code          │  │    │
│  │  │ → Auto-fills: L006, L007, L008                 │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ Document Info                                   │  │    │
│  │  │ → Branch (L001), Date (L005)                   │  │    │
│  │  │ → Document type (L064), Reverse VAT (L069)     │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  For Each Line Item:                                   │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ Product Code (L010) - from materials table     │  │    │
│  │  │ Responsible Person (L022-L023) - dropdown      │  │    │
│  │  │ Accounting Op (L028-L029) - dropdown           │  │    │
│  │  │ VAT Rate (L016-L017) - input or special code   │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  [Preview JSON] [Export]                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Validation & Export                                   │    │
│  │  → Validates all L001-L084 fields                     │    │
│  │  → Generates JSON payload                             │    │
│  │  → Saves to secretary_invoice_exports                 │    │
│  │  → (Future) Sends to secretary system                 │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

                              ↕️ Daily Sync

┌─────────────────────────────────────────────────────────────────┐
│                    Secretary System                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Reference Data (Gratui.xls)                           │    │
│  │  → Materials (2,929)                                   │    │
│  │  → Services (1,661)                                    │    │
│  │  → Suppliers (2,454)                                   │    │
│  │  → Responsible Persons (11)                            │    │
│  │  → Accounting Operations (222)                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  N8N Workflow (Every 6 hours)                          │    │
│  │  → Fetch latest data                                   │    │
│  │  → Convert to JSON                                     │    │
│  │  → Send to OKSANA Edge Function                       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

```
┌──────────────────────────────────────────────────────────────┐
│                    Supabase Tables                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  LOOKUP TABLES (Synced Daily/Hourly)                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │ secretary_materials                                 │     │
│  │ - code (PK, unique)                                │     │
│  │ - name, unit_type, vat_purchase, vat_sale         │     │
│  │ - last_synced_at                                   │     │
│  │ → Used for L010, L011, L012, L016                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ secretary_suppliers                                 │     │
│  │ - code (PK, unique)                                │     │
│  │ - name, company_code, vat_code, bank_account      │     │
│  │ - last_synced_at                                   │     │
│  │ → Used for L006, L007, L008                        │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ secretary_responsible_persons                       │     │
│  │ - code (PK, unique)                                │     │
│  │ - name, additional_info (role)                     │     │
│  │ → Used for L022, L023                              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ secretary_accounting_operations                     │     │
│  │ - code (PK, unique)                                │     │
│  │ - name, debit, credit, expense_structure           │     │
│  │ → Used for L028, L029, L030                        │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  INVOICE TABLES (Updated)                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │ equipment_invoices                                  │     │
│  │ + branch_number (L001)                             │     │
│  │ + document_series_number (L003)                    │     │
│  │ + supplier_unique_code (L006)                      │     │
│  │ + document_type_flag (L064)                        │     │
│  │ + reverse_vat_indicator (L069)                     │     │
│  │ + 15 more L-fields...                              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ equipment_invoice_items                             │     │
│  │ + product_code (L010)                              │     │
│  │ + unit_type (L012)                                 │     │
│  │ + vat_rate (L016)                                  │     │
│  │ + responsible_person_code (L022)                   │     │
│  │ + accounting_op1_debit (L028)                      │     │
│  │ + 25 more L-fields...                              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  AUDIT TABLE                                                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │ secretary_invoice_exports                           │     │
│  │ - invoice_id (FK)                                  │     │
│  │ - export_payload (JSONB) ← Full L001-L084         │     │
│  │ - export_status, exported_at, exported_by          │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## 🎨 UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Invoice List                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 📄 DOM0007982                                      │    │
│  │    Hemessen 250 Essen · 2026-03-26                │    │
│  │    €150.00                            [Eksportuoti] │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓ Click                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔵 Eksportas į sekretorės sistemą                      ││
│  │                                                         ││
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ││
│  │ ┃ 🏢 Tiekėjo informacija (L006-L008)               ┃ ││
│  │ ┃                                                   ┃ ││
│  │ ┃ [🔍 Search: "Hemessen"___________________]       ┃ ││
│  │ ┃                                                   ┃ ││
│  │ ┃ ┌─────────────────────────────────────────────┐ ┃ ││
│  │ ┃ │ ✓ Hemessen 250 Essen                        │ ┃ ││
│  │ ┃ │   Kodas: 3293  Įm. kodas: -  PVM: -        │ ┃ ││
│  │ ┃ └─────────────────────────────────────────────┘ ┃ ││
│  │ ┃                                                   ┃ ││
│  │ ┃ Selected:                                         ┃ ││
│  │ ┃ L006: 3293                                       ┃ ││
│  │ ┃ L007: Hemessen 250 Essen                         ┃ ││
│  │ ┃ L008: EUR                                        ┃ ││
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ││
│  │                                                         ││
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ││
│  │ ┃ 📄 Dokumento informacija                          ┃ ││
│  │ ┃ L001: [1___] L003: [DOM0007982________]          ┃ ││
│  │ ┃ L064: [P - Įprastas ▼] L069: [Nėra ▼]           ┃ ││
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ││
│  │                                                         ││
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ││
│  │ ┃ 📋 Sąskaitos eilutės (3)                          ┃ ││
│  │ ┃                                                   ┃ ││
│  │ ┃ [#1] Bass nugarinis akumuliatorinis              ┃ ││
│  │ ┃      Kiekis: 2  Vienetas: vnt  Suma: 150.00 EUR ┃ ││
│  │ ┃      [Redaguoti ▼]                               ┃ ││
│  │ ┃                                                   ┃ ││
│  │ ┃      L010: [2802_____________] (Product code)    ┃ ││
│  │ ┃      L022: [3 - Vadimas Kovalevskis ▼]          ┃ ││
│  │ ┃      L028-L029: [1 - Atsarginės Dalys ▼]        ┃ ││
│  │ ┃                 D:20007  K:451                   ┃ ││
│  │ ┃      L016: [21%] L017: [31.50 EUR]              ┃ ││
│  │ ┃                                                   ┃ ││
│  │ ┃ [#2] ... (more items)                            ┃ ││
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ││
│  │                                                         ││
│  │ [Atšaukti] [Išsaugoti] [Peržiūrėti JSON] [Eksportuoti]││
│  └─────────────────────────────────────────────────────────┘│
│                           ↓ Click "Peržiūrėti JSON"            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 🔍 JSON Payload Preview                                 │  │
│  │                                                         │  │
│  │ ✅ Visi privalomi laukai užpildyti                     │  │
│  │                                                         │  │
│  │ ┌───────────────────────────────────────────────────┐ │  │
│  │ │ {                                                 │ │  │
│  │ │   "L001": "1",                                    │ │  │
│  │ │   "L002": "865",                                  │ │  │
│  │ │   "L003": "DOM0007982",                           │ │  │
│  │ │   "L005": "20260326",                             │ │  │
│  │ │   "L006": "3293",                                 │ │  │
│  │ │   "L007": "Hemessen 250 Essen",                   │ │  │
│  │ │   "L008": "EUR",                                  │ │  │
│  │ │   "items": [...]                                  │ │  │
│  │ │ }                                                 │ │  │
│  │ └───────────────────────────────────────────────────┘ │  │
│  │                                                         │  │
│  │ [Uždaryti] [Atsisiųsti JSON] [Patvirtinti ir eksportuoti]│
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Sync Flow

```
┌──────────────────┐
│  Secretary       │
│  System          │
│                  │
│  Gratui.xls      │
│  - Medžiagos     │
│  - Paslaugos     │
│  - Tiekėjai      │
│  - Atsakingi     │
│  - Ūkinės op.    │
└────────┬─────────┘
         │
         │ Export (manual or API)
         ↓
┌──────────────────┐
│  Gratui.xls      │
│  (Downloaded)    │
└────────┬─────────┘
         │
         │ python convert_xls_to_json.py
         ↓
┌──────────────────┐
│ secretary_data   │
│     .json        │
│  (7,277 records) │
└────────┬─────────┘
         │
         │ Manual: npx tsx scripts/import_secretary_data.ts
         │    OR
         │ Auto: N8N → Supabase Edge Function
         ↓
┌──────────────────────────────────────────────┐
│  Supabase Tables                             │
│  ✓ secretary_materials (2,929)              │
│  ✓ secretary_services (1,661)               │
│  ✓ secretary_suppliers (2,454)              │
│  ✓ secretary_responsible_persons (11)       │
│  ✓ secretary_accounting_operations (222)    │
└──────────────────────────────────────────────┘
         │
         │ Used by UI for lookups
         ↓
┌──────────────────┐
│  SecretarySystem │
│  Export Modal    │
│  (Smart lookups) │
└──────────────────┘
```

## 🎯 Field Categories

### 🔴 Mandatory Header Fields (Cannot export without)

| Field | Name | How to Fill |
|-------|------|-------------|
| L001 | Branch | Default "1" (editable) |
| L002 | Doc type | Fixed "865" |
| L003/L004 | Invoice # | From invoice (one required) |
| L005 | Date | From invoice |
| L006 | Supplier code | **Search by name** → select |
| L007 | Supplier name | Auto-filled |
| L008 | Currency | Auto-filled (usually EUR) |

### 🔴 Mandatory Item Fields (Per line item)

| Field | Name | How to Fill |
|-------|------|-------------|
| L010 | Product code | From materials table or manual |
| L011 | Product name | From invoice |
| L012 | Unit | From materials or manual |
| L013 | Sign | 0=positive, 1=negative |
| L014 | Quantity × 1000 | Auto-calculated |
| L015 | Sum × 100 | Auto-calculated |
| L016 | VAT rate × 100 | Input % or special code |
| L017 | VAT sum × 100 | Auto-calculated |
| L022 | Person code | **Dropdown** → select |
| L023 | Person name | Auto-filled |
| L028 | Debit | **Dropdown** → select operation |
| L029 | Credit | Auto-filled (usually 451) |

### 🟡 Optional Fields (Use when needed)

| Field | Name | When to Use |
|-------|------|-------------|
| L064 | Doc type | D=debit, K=credit, M=margin |
| L069 | Reverse VAT | Foreign, construction, special cases |
| L070 | Non-VAT | Supplier not VAT payer |
| L071-L072 | Bank accounts | Payment tracking |
| L078-L081 | VAT debtor/creditor | Construction, wood, metal |

## 🎨 Color Coding in UI

- 🔵 **Blue** - Supplier information
- 🟣 **Purple** - Document information  
- 🟢 **Green** - VAT information
- 🔵 **Blue** - Responsible person
- 🟡 **Amber** - Accounting operations
- ⚪ **Gray** - Optional fields

## 📱 User Journey

### Secretary's Perspective

```
Step 1: Upload Invoice
┌─────────────────────────┐
│ [📄 Pasirinkti PDF]     │
│                         │
│ Selected: invoice.pdf   │
│ [⬆️ Įkelti]             │
└─────────────────────────┘

Step 2: Review Parsed Data
┌─────────────────────────┐
│ Tiekėjas: Hemessen      │
│ Data: 2026-03-26        │
│ Suma: €150.00           │
│                         │
│ Prekės:                 │
│ 1. Bass puršktuvas      │
│ 2. Alyva                │
│                         │
│ [✅ Patvirtinti]        │
└─────────────────────────┘

Step 3: Prepare Export
┌─────────────────────────┐
│ Invoice confirmed!      │
│                         │
│ [📤 Eksportuoti]        │
└─────────────────────────┘
         ↓ Click
┌─────────────────────────────────────────┐
│ 🔵 Eksportas į sekretorės sistemą      │
│                                         │
│ 🔍 Ieškoti tiekėjo:                    │
│ [Hemessen_____________]                 │
│                                         │
│ Results:                                │
│ ✓ Hemessen 250 Essen                   │
│   Kodas: 3293                           │
│                                         │
│ For each item:                          │
│ 👤 Atsakingas: [Vadimas Kovalevskis ▼] │
│ 💰 Operacija: [Atsarginės dalys ▼]     │
│                                         │
│ [👁️ Peržiūrėti JSON] [📤 Eksportuoti]  │
└─────────────────────────────────────────┘

Step 4: Preview & Validate
┌─────────────────────────────────────────┐
│ 🔍 JSON Payload Preview                 │
│                                         │
│ ✅ Visi privalomi laukai užpildyti     │
│                                         │
│ {                                       │
│   "L001": "1",                          │
│   "L006": "3293",                       │
│   "items": [...]                        │
│ }                                       │
│                                         │
│ [💾 Atsisiųsti] [✅ Patvirtinti]        │
└─────────────────────────────────────────┘

Step 5: Export Complete
┌─────────────────────────┐
│ ✅ Eksportas paruoštas! │
│                         │
│ JSON payload išsaugotas │
│ sistemoje.              │
└─────────────────────────┘
```

## 🔢 Data Transformations

### Example: Invoice Item

**Input** (from PDF):
```
Description: Bass nugarinis akumuliatorinis puršktuvas
Quantity: 2
Price: 75.00 EUR
Total: 150.00 EUR
```

**After Secretary Fills**:
```
Supplier: Hemessen 250 Essen (code: 3293)
Responsible: Vadimas Kovalevskis (code: 3)
Operation: Atsarginės Dalys (debit: 20007, credit: 451)
VAT: 21%
```

**Output** (L001-L084 format):
```json
{
  "L001": "1",
  "L002": "865",
  "L003": "DOM0007982",
  "L005": "20260326",
  "L006": "3293",
  "L007": "Hemessen 250 Essen",
  "L008": "EUR",
  "items": [{
    "L009": 0,
    "L010": "2802",
    "L011": "Bass nugarinis akumuliatorinis",
    "L012": "vnt",
    "L013": 0,
    "L014": 2000,        ← 2 × 1000
    "L015": 15000,       ← 150.00 × 100
    "L016": "2100",      ← 21% × 100
    "L017": 3150,        ← 31.50 × 100
    "L022": "3",
    "L023": "Vadimas Kovalevskis",
    "L028": "20007",
    "L029": "451"
  }]
}
```

## 🎓 Quick Reference for Secretaries

### Common Accounting Operations

| What You're Buying | Select This | Debit | Credit |
|-------------------|-------------|-------|--------|
| Pašarai (Feed) | Pašarų Pirkimas | 20001 | 451 |
| Sėkla (Seeds) | Pirkta Sėkla | 20002 | 451 |
| Trąšos (Fertilizers) | Pirktos Trąšos | 20003 | 451 |
| Augalų apsauga | Augalų Apsaug. Priemonė | 20004 | 451 |
| Vaistai (Medicine) | Medikamentai ir preparatai | 20005 | 451 |
| Degalai (Fuel) | Degalai Tepalai | 20006 | 451 |
| Atsarginės dalys | Atsarginės Dalys | 20007 | 451 |
| Statybinės medžiagos | Statybinės Medžiagos | 20008 | 451 |

### Common Responsible Persons

| Code | Name | Role |
|------|------|------|
| 3 | Vadimas Kovalevskis | Komercijos direktorius |
| 6 | Daiva Ramaškevičiūtė | Vyr.buhalterė-kasininkė |
| 8 | Oksana Puronaitė | Direktorės pavaduotoja |
| 11 | Algirdas Karklis | Agronomas |
| 12 | Kristina Puronaitė | Direktorė |
| 14 | Ramutis Bartulis | Vet. gydytojas |

### VAT Rates

- **21%** - Standard rate (most items)
- **9%** - Reduced rate (some items)
- **0%** - Zero rate (with special code B)
- **Special codes**:
  - A = Non-taxable
  - B = Zero rate
  - C = Not VAT object
  - D = No VAT

## 📊 Success Metrics

**What Success Looks Like**:
- ✅ Secretary can search supplier by name
- ✅ System shows supplier code automatically
- ✅ All dropdowns populated with real data
- ✅ JSON preview shows complete structure
- ✅ Validation catches missing fields
- ✅ Export saves successfully
- ✅ JSON can be downloaded
- ✅ No manual code entry needed (except products)

**Current Status**: 
- ✅ All components built
- ✅ All utilities created
- ✅ Data converted (7,277 records)
- ⏳ Needs migration application
- ⏳ Needs data import
- ⏳ Needs testing

## 🚀 Ready to Launch

Everything is built and ready. Just need to:
1. Apply migration (when Docker running)
2. Import data (one command or UI button)
3. Test with real invoice
4. Gather feedback
5. Refine as needed

---

**Built by**: AI Assistant  
**Date**: 2026-03-26  
**Status**: ✅ **READY FOR TESTING**
