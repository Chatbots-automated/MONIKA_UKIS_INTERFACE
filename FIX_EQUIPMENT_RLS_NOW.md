# Equipment RLS Fix - Manual Steps Required

## Problem
Categories don't show in dropdown and products can't be created due to RLS (Row Level Security) blocking authenticated users.

## Why Can't We Fix It Automatically?
Supabase doesn't allow executing `CREATE POLICY` or `DROP POLICY` commands through the JavaScript API. These must be run in the SQL Editor.

## Quick Fix Steps

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt

### 2. Click "SQL Editor" → "New Query"

### 3. Paste and Run This SQL:

```sql
-- Fix equipment_categories RLS
DROP POLICY IF EXISTS "Authenticated users can view equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can manage equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can update equipment categories" ON equipment_categories CASCADE;
DROP POLICY IF EXISTS "Authenticated users can delete equipment categories" ON equipment_categories CASCADE;

CREATE POLICY "Authenticated users can view equipment categories"
  ON equipment_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert equipment categories"
  ON equipment_categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment categories"
  ON equipment_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipment categories"
  ON equipment_categories FOR DELETE TO authenticated USING (true);

-- Fix equipment_products RLS
DROP POLICY IF EXISTS "Authenticated users can view equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can manage equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can update equipment products" ON equipment_products CASCADE;
DROP POLICY IF EXISTS "Authenticated users can delete equipment products" ON equipment_products CASCADE;

CREATE POLICY "Authenticated users can view equipment products"
  ON equipment_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert equipment products"
  ON equipment_products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment products"
  ON equipment_products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipment products"
  ON equipment_products FOR DELETE TO authenticated USING (true);
```

### 4. Click "Run" (or Cmd/Ctrl + Enter)

You should see: **"Success. No rows returned"**

### 5. Refresh Your Browser

Press F5 or reload the page.

## Result

After running the SQL:
- ✓ Category dropdown will show all 14 categories
- ✓ Products can be created without errors
- ✓ Full CRUD access to equipment data for authenticated users
