# Technika Module Database Migration Instructions

The Technika module requires a comprehensive database schema. Due to the complexity of the migration, it needs to be applied via the Supabase Dashboard SQL Editor.

## How to Apply the Migration

1. Visit your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to the SQL Editor
4. Copy the entire contents of `technika-migration.sql` (see below)
5. Paste into the SQL Editor
6. Click "Run"

## Migration SQL File Location

The complete migration SQL has been prepared and can be found at:
- `/tmp/technika-migration.sql`

## What This Migration Creates

### Tables (17 total):
1. **equipment_categories** - Categories for tools, PPE, parts, etc.
2. **equipment_suppliers** - Supplier contact information
3. **equipment_products** - Product catalog
4. **equipment_locations** - Physical storage locations
5. **equipment_invoices** - Purchase invoices
6. **equipment_invoice_items** - Invoice line items
7. **equipment_batches** - Batch/lot tracking
8. **tools** - Individual tool records
9. **tool_movements** - Tool checkout/return history
10. **ppe_items** - PPE inventory
11. **ppe_issuance_records** - PPE issued to employees
12. **vehicles** - Fleet vehicles and machinery
13. **vehicle_mileage_log** - Odometer/engine hours tracking
14. **maintenance_schedules** - Planned maintenance rules
15. **maintenance_work_orders** - Service work orders
16. **work_order_items** - Parts used in work orders
17. **equipment_audit_log** - Audit trail

### Features:
- Row Level Security (RLS) enabled on all tables
- Comprehensive indexes for performance
- Automatic stock deduction when work orders complete
- Auto-generated work order numbers
- Updated_at timestamp triggers
- Default categories and locations seeded

### Permissions:
- All users can view equipment data
- Admin and Vet roles can manage all data
- Assistant role can manage most operational data
- Users can view their own PPE issuance records

## Alternative: Manual Table Creation

If you prefer, you can also run the migration script we've prepared:

```bash
# This would require manual SQL execution via Supabase Dashboard
# The script is available in this directory
```

## Next Steps

After applying the migration:
1. Verify tables were created successfully
2. Check that seed data was inserted (categories and locations)
3. Test RLS policies work correctly
4. Begin using the Technika module UI components
