# Invoices Report Tab Implementation

## Overview
Added a comprehensive "Sąskaitos" (Invoices) tab in the Ataskaitos (Reports) section that displays all invoices with full details, assignment tracking, and download capability.

## Features

### 📊 **Statistics Dashboard**
Five key metrics displayed at the top:
1. **Total Invoices** - Count of all invoices
2. **Total Value** - Sum of all invoice amounts
3. **Total Items** - Count of all invoice items
4. **Assigned Items** - Items that have been assigned
5. **Unassigned Items** - Items waiting for assignment

### 📄 **Invoice List**
- **All invoices** displayed in expandable cards
- **Sort by date** - Most recent first
- **Key info visible**:
  - Invoice number
  - Supplier name
  - Invoice date
  - Number of items
  - Total amount
  - Download button

### 📥 **Download Functionality**
- **Binary data support** - Downloads from `file_data` column (base64)
- **Storage support** - Falls back to Supabase storage if no binary data
- **One-click download** - Click download icon to get PDF
- **Auto-naming** - Files named as `{invoice_number}.pdf`

### 🔍 **Expanded Invoice View**
When you click on an invoice, you see:

#### Invoice Details:
- Supplier name
- Invoice date
- Net amount (without VAT)
- Gross amount (with VAT)

#### Items List:
Each item shows:
- **Product name** and code
- **Quantity** and unit type
- **Price** (unit and total)
- **Assignment status**

#### Assignment Tracking:
For each assigned item, displays:
- ✅ **Worker** - Shows worker name with 👤 icon
- ✅ **Vehicle** - Shows registration, make, model with 🚗 icon
- ✅ **Cost Center** - Shows cost center name with 💰 icon
- ✅ **Shelf** - Shows shelf and compartment code with 📦 icon
- ✅ **Tool** - Shows tool name with 🔧 icon
- ✅ **Building** - Shows building assignment with 📍 icon
- ✅ **General Farm** - Shows general farm assignment
- ✅ **Transport Service** - Shows transport service assignment
- **Assignment notes** - Any notes added during assignment
- **Assignment date/time** - When it was assigned

#### Unassigned Items:
- Shows amber warning icon ⚠️
- Clearly marked as "Nepriskirta" (Unassigned)

## Technical Implementation

### Database Query
Fetches complete invoice data with nested relationships:
```typescript
equipment_invoices
  ├── equipment_invoice_items
  │   ├── equipment_products (name, code)
  │   └── equipment_invoice_item_assignments
  │       ├── cost_centers (name)
  │       ├── users (full_name)
  │       ├── vehicles (registration, make, model)
  │       ├── equipment_shelf_compartments
  │       │   └── equipment_shelves (shelf_number, name)
  │       └── tools (name, tool_number)
```

### Download Logic
```typescript
handleDownloadInvoice(invoiceId, invoiceNumber)
1. Fetch invoice file_data or file_path
2. If file_data exists:
   - Decode base64 to binary
   - Create Blob
   - Trigger download
3. If file_path exists:
   - Download from Supabase storage
   - Trigger download
4. If neither exists:
   - Show error message
```

### State Management
```typescript
const [invoices, setInvoices] = useState<any[]>([]);
const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
const [invoiceStats, setInvoiceStats] = useState({
  totalInvoices: 0,
  totalValue: 0,
  totalItems: 0,
  assignedItems: 0,
  unassignedItems: 0,
});
```

## Files Modified

### `src/components/technika/TechnikaReports.tsx`
**Changes**:
1. Added `'invoices'` to `activeTab` type
2. Added invoice state variables
3. Added `loadInvoicesData()` function
4. Added `handleDownloadInvoice()` function
5. Added "Sąskaitos" tab to tab list
6. Added complete invoice UI with expandable cards

**New Functions**:
- `loadInvoicesData()` - Loads all invoices with items and assignments
- `handleDownloadInvoice()` - Downloads invoice PDF from binary data or storage

**New State**:
- `invoices` - Array of all invoices
- `expandedInvoice` - Currently expanded invoice ID
- `invoiceStats` - Statistics object

## How It Works

### For Users:
1. **Navigate** to Technika → Ataskaitos → Sąskaitos tab
2. **View statistics** at the top showing totals
3. **Browse invoices** in the list
4. **Download** any invoice by clicking the download icon
5. **Expand** an invoice to see:
   - Full invoice details
   - All items in the invoice
   - Where each item was assigned
   - Assignment notes and timestamps
6. **Track unassigned items** - Easily see which items need assignment

### Assignment Type Icons:
- 👤 Worker
- 🚗 Vehicle
- 💰 Cost Center
- 📦 Shelf
- 🔧 Tool
- 📍 Building/General/Transport

## Binary Data Storage

### How It Works:
When uploading an invoice in the Sąskaitos tab:
1. **File is uploaded** via file input
2. **Binary data is extracted** and converted to base64
3. **Stored in `file_data` column** in `equipment_invoices` table
4. **Also stored in Supabase storage** as backup (if configured)

### Download Process:
1. **Check `file_data` first** - Fastest, no storage query needed
2. **Fall back to `file_path`** - If binary data not available
3. **Convert and download** - Create blob and trigger browser download

## Benefits

### ✅ Complete Transparency
- See every invoice ever uploaded
- Track where every item went
- Full audit trail with timestamps

### ✅ Easy Access
- One-click download of any invoice
- No need to search through files
- All data in one place

### ✅ Assignment Tracking
- See which items are assigned
- See which items need attention
- Track assignment history

### ✅ Reporting
- Quick statistics overview
- Filter by date range (inherited from parent)
- Export capabilities (future enhancement)

## Future Enhancements

Potential additions:
- Search/filter invoices by supplier, number, date
- Bulk download multiple invoices
- Export invoice list to Excel
- Filter by assignment status (assigned/unassigned)
- Invoice approval workflow
- Duplicate invoice detection
- Invoice matching with purchase orders
- Supplier performance metrics

## Notes

- Binary data is stored as base64 in `file_data` column
- Falls back to Supabase storage if binary data not available
- All invoices are loaded (no pagination yet - consider adding for large datasets)
- Expandable UI keeps interface clean while showing full details
- Assignment icons make it easy to scan and understand where items went
- Unassigned items are clearly marked for follow-up

## Testing Checklist

- [ ] Navigate to Ataskaitos → Sąskaitos tab
- [ ] Verify statistics cards show correct totals
- [ ] Click on an invoice to expand it
- [ ] Verify invoice details are displayed correctly
- [ ] Check that all items are listed
- [ ] Verify assignment information shows correctly
- [ ] Click download button and verify PDF downloads
- [ ] Check that unassigned items show warning icon
- [ ] Verify date filtering works (inherited from parent)
- [ ] Test with invoices that have no items
- [ ] Test with invoices that have no file data
