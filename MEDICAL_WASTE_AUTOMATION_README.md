# Automated Medical Waste Tracking System

## Overview

The automated medical waste tracking system generates waste entries instantly when product batches are completely depleted (reach zero stock). Each batch creates a separate medical waste entry with calculated empty package weights.

## Features

### 1. Database Layer
- **Products Table**: New `package_weight_g` column stores empty package weight in grams
- **Medical Waste Table**: Enhanced with auto-generation tracking fields
- **Batch Waste Tracking**: Prevents duplicate waste generation for the same batch
- **Automatic Trigger**: Monitors `usage_items` table and generates waste when batch reaches 0 stock
- **Database View**: `vw_medical_waste_with_details` provides enriched waste data

### 2. User Interface

#### Products Module
- New field: "Pakuotės svoris (tuščios)" in product form
- Optional field, measured in grams
- Position: After the "Vienetas" (Unit) field
- Help text explains automatic waste generation

#### Medical Waste Module
- Visual badges distinguish automatic vs manual entries:
  - **Blue badge "AUTOMATINIS"**: Auto-generated entries
  - **Gray badge "RANKINIS"**: Manual entries
- Filter dropdown to view:
  - All entries
  - Only automatic entries
  - Only manual entries
- Auto-generated entries display:
  - Source product name
  - Batch lot number
  - Package count
  - Generation timestamp
- Blue background for auto-generated entries

### 3. Real-Time Notifications
- Toast notification appears when waste is auto-generated
- Shows product name, batch lot, and weight
- Auto-dismisses after 5 seconds
- Helps users stay informed of waste generation events

## How to Apply the Migration

### Option 1: Using the Node.js Script (Recommended)

1. Get your Supabase database password:
   - Go to Supabase Dashboard → Settings → Database
   - Find "Database Password" section
   - Copy your password

2. Run the migration script:
   ```bash
   DB_PASSWORD=your_password_here node apply_medical_waste_automation.js
   ```

### Option 2: Manual SQL Execution

1. Go to Supabase Dashboard → SQL Editor
2. Open the file `apply_medical_waste_automation.sql`
3. Copy all contents
4. Paste into SQL Editor
5. Click "Run"

## How It Works

### Workflow

1. **Product Configuration**
   - Add empty package weight (in grams) to products
   - Field is optional but required for automatic waste generation
   - Only needs to be set once per product

2. **Stock Usage**
   - When medications are used, stock is deducted from batches
   - System continuously monitors batch stock levels
   - Trigger fires on every `usage_items` insert

3. **Waste Generation**
   - When batch stock reaches exactly 0:
     - System checks if waste already generated for this batch
     - If not, calculates: `package_count × package_weight_g`
     - Creates medical waste entry with proper waste code
     - Records in tracking table to prevent duplicates
     - Sends real-time notification to users

4. **Waste Code Assignment**
   - Medicines: `18 02 02`
   - Vaccines: `18 02 02`
   - Prevention: `18 02 02`
   - Syringes: `18 02 01`
   - Other: `18 02 02` (default)

### Example

**Product Configuration:**
- Product: "Penicillin 100ml"
- Package weight: 45.5 g
- Category: medicines

**Batch Receipt:**
- Lot: LOT-2024-001
- Received quantity: 500 ml
- Package count: 5 bottles

**Usage:**
- Treatment 1: Uses 200 ml
- Treatment 2: Uses 200 ml
- Treatment 3: Uses 100 ml (final usage, batch reaches 0)

**Automatic Result:**
- Medical waste entry created immediately
- Name: "Penicillin 100ml - Partija LOT-2024-001"
- Code: "18 02 02"
- Weight: 227.5 g (5 packages × 45.5 g)
- Package count: 5
- Auto-generated: true

## Benefits

1. **Compliance**: Automatic tracking ensures no waste goes unrecorded
2. **Accuracy**: Calculated from actual package data, not estimates
3. **Batch Traceability**: Every waste entry links to specific batch and product
4. **Time Savings**: No manual waste entry needed for depleted batches
5. **Audit Trail**: Complete chain from batch receipt to waste generation
6. **Prevention of Duplicates**: Tracking table ensures one waste entry per batch
7. **Real-Time Awareness**: Instant notifications keep users informed

## Important Notes

### Edge Cases Handled

1. **Products without package weight**: System silently skips waste generation
2. **Batch corrections**: If stock goes back above 0, no duplicate waste created
3. **Concurrent usage**: Database locks prevent race conditions
4. **Missing batch data**: Function handles gracefully with null checks
5. **Manual batch deletion**: Waste record retained for audit (FK: ON DELETE SET NULL)

### Migration Safety

- Uses `IF NOT EXISTS` checks throughout
- Idempotent - safe to run multiple times
- Non-destructive - no data loss
- Backward compatible - existing manual entries unaffected

### Performance

- Indexed columns for fast queries
- View optimized for common access patterns
- Trigger logic minimal to avoid bottlenecks
- Real-time subscriptions efficient with filtering

## Testing Checklist

After applying the migration, verify:

1. **Database Schema**
   ```sql
   -- Check products table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'products' AND column_name = 'package_weight_g';

   -- Check medical_waste table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'medical_waste'
   AND column_name IN ('auto_generated', 'source_batch_id', 'source_product_id', 'package_count');

   -- Check batch_waste_tracking table
   SELECT * FROM batch_waste_tracking LIMIT 1;

   -- Check view
   SELECT * FROM vw_medical_waste_with_details LIMIT 1;
   ```

2. **UI Components**
   - Products form shows "Pakuotės svoris (tuščios)" field
   - Medical Waste shows filter dropdown
   - Auto-generated entries display with blue badge
   - Manual entries display with gray badge

3. **Functional Test**
   - Create/edit product with package weight
   - Create batch with package count
   - Use medication until batch reaches 0
   - Verify waste entry created automatically
   - Check notification appears
   - Verify entry shows in Medical Waste with correct badge

## Future Enhancements

Potential improvements not included in initial implementation:

1. **Dashboard Widget**: Analytics card showing auto-generated waste trends
2. **Batch Grouping**: Expandable product sections listing all depleted batches
3. **Reports**: Dedicated compliance reports for medical waste
4. **Configuration**: Admin settings for waste codes per category
5. **Bulk Updates**: Mass add package weights to multiple products
6. **Export**: PDF/Excel export with batch-level traceability
7. **Alerts**: Email notifications for waste generation events

## Support

For issues or questions:
1. Check migration logs for any errors
2. Verify database password is correct
3. Ensure Supabase project is accessible
4. Review SQL execution output for specific errors

## Technical Details

### Database Objects Created

- **Table**: `batch_waste_tracking` (with RLS policies)
- **Function**: `auto_generate_medical_waste(uuid)` (SECURITY DEFINER)
- **Function**: `check_batch_depletion()` (trigger function)
- **Trigger**: `trigger_check_batch_depletion` on `usage_items`
- **View**: `vw_medical_waste_with_details`
- **Columns**: 5 new columns across 2 tables
- **Indexes**: 3 new indexes for performance
- **Realtime**: Enabled for `batch_waste_tracking` table

### TypeScript Types Updated

- `Product`: Added `package_weight_g`
- `MedicalWaste`: Added 4 new fields
- `MedicalWasteWithDetails`: New extended interface
- `WasteSource`: New type alias

### Components Modified

- `Products.tsx`: Package weight field added
- `MedicalWaste.tsx`: Complete redesign with filtering and badges
- Real-time notifications integrated

## Version

Migration timestamp: `20251206000000`

Built with Supabase PostgreSQL, React, and TypeScript.
