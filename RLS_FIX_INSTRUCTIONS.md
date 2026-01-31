# Equipment RLS Policy Fix Instructions

## Problem
The equipment management system has Row Level Security (RLS) policies that are blocking authenticated users from:
- Viewing categories in the dropdown
- Creating new products (error: "new row violates row-level security policy")

## Solution
Run the SQL commands below in your Supabase Dashboard to fix the RLS policies.

## Steps to Fix

### Option 1: Run SQL File (Recommended)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Open the file `fix-equipment-rls-policies.sql` from this project
5. Copy the entire contents and paste into the SQL editor
6. Click **"Run"** or press `Cmd/Ctrl + Enter`
7. You should see "Success. No rows returned"

### Option 2: Manual Commands
If you prefer, run these SQL commands one by one in the SQL Editor:

```sql
-- Fix equipment_categories RLS policies
DROP POLICY IF EXISTS "Authenticated users can view equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can manage equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can update equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can delete equipment categories" ON equipment_categories CASCADE;

CREATE POLICY "Authenticated users can view equipment categories"
  ON equipment_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert equipment categories"
  ON equipment_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment categories"
  ON equipment_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipment categories"
  ON equipment_categories FOR DELETE
  TO authenticated
  USING (true);

-- Fix equipment_products RLS policies
DROP POLICY IF EXISTS "Authenticated users can view equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can manage equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can update equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can delete equipment products" ON equipment_products CASCADE;

CREATE POLICY "Authenticated users can view equipment products"
  ON equipment_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert equipment products"
  ON equipment_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment products"
  ON equipment_products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipment products"
  ON equipment_products FOR DELETE
  TO authenticated
  USING (true);
```

## After Running the Fix

Once you've run the SQL commands:

1. **Refresh your browser** (press F5 or Cmd/Ctrl + R)
2. Go back to the Technika module → Sąskaitos
3. Try creating a new product - the category dropdown should now work
4. You should be able to create products without RLS errors

## What This Does

These SQL commands:
- Remove the old restrictive RLS policies
- Create new policies that allow authenticated users to:
  - View all categories and products
  - Create new categories and products
  - Update existing categories and products
  - Delete categories and products

The policies are secure because they still require authentication - only logged-in users can access the data.
