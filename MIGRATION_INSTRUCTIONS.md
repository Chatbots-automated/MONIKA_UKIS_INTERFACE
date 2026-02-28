# Database Migration Instructions

## Important: Run These Migrations

You need to run the following SQL migrations in your Supabase database to enable the new features:

### 1. Storage Setup for Kaupiniai Files
**File:** `supabase/migrations/20260218_setup_kaupiniai_storage.sql`

This migration:
- Creates two new storage buckets: `kaupiniai-documents` and `kaupiniai-acts`
- Sets up RLS policies for file uploads, downloads, and deletions
- **Note:** Updated to work with custom authentication (uses `anon` role)

### 2. Enhanced Cost Centers and Documents
**File:** `supabase/migrations/20260218_enhance_cost_centers_and_documents.sql`

This migration:
- Adds `comments` field to cost accumulation documents
- Adds `act_number`, `act_file_path`, and `act_file_url` fields
- Creates an index on `act_number` for performance

### 3. Technical Inspection Task Type (if not already run)
**File:** `supabase/migrations/20260218_add_technical_inspection_task_type.sql`

This migration:
- Updates the `worker_task_reports.task_type` CHECK constraint
- Adds `'technical_inspection'` as a valid task type

## How to Run Migrations

### Option 1: Using Supabase CLI
```bash
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Execute them in order

## Verification

After running the migrations, verify:

1. **Storage Buckets:**
   - Go to Storage in Supabase Dashboard
   - You should see `kaupiniai-documents` and `kaupiniai-acts` buckets

2. **Database Columns:**
   - Check `cost_accumulation_documents` table
   - Should have new columns: `comments`, `act_number`, `act_file_path`, `act_file_url`

3. **Worker Task Reports:**
   - Check `worker_task_reports` table constraints
   - `task_type` should accept: `work_order`, `maintenance_schedule`, `farm_equipment_service`, `technical_inspection`

## New Features Enabled

### Kaupiniai Tab
- ✅ Upload actual PDF files (stored in Supabase Storage)
- ✅ Add comments to each uploaded document
- ✅ Upload and link "act" files to documents
- ✅ Add official act numbers
- ✅ View documents directly in the browser
- ✅ Download both main documents and acts

### Saskaitos Tab (Multi-Invoice Upload)
- ✅ Individual file review mode (one at a time)
- ✅ Large preview for each invoice
- ✅ Keep/Discard decision for each file
- ✅ Progress indicator showing review status
- ✅ Cleaner batch processing view

### Cost Centers
- ✅ Improved 3-level hierarchy display
- ✅ Single-column layout for better readability
- ✅ Clear visual indentation for parent/child/grandchild relationships
- ✅ Better spacing and hover states

## Troubleshooting

### RLS Policy Errors
If you get "new row violates row-level security policy" errors:
- Make sure you ran the updated `20260218_setup_kaupiniai_storage.sql` migration
- The policies should allow both `anon` and `authenticated` roles
- This is necessary because the app uses custom authentication

### File Upload Errors
- Check that storage buckets exist in Supabase Dashboard
- Verify bucket names are exactly: `kaupiniai-documents` and `kaupiniai-acts`
- Check that RLS policies are enabled on both buckets

### Task Type Constraint Errors
- Run the `20260218_add_technical_inspection_task_type.sql` migration
- This updates the CHECK constraint to include all valid task types
