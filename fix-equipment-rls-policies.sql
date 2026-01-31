-- Fix RLS policies for equipment_categories and equipment_products tables
-- This allows authenticated users to view and manage equipment data

-- ============================================
-- Fix equipment_categories RLS policies
-- ============================================

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

-- ============================================
-- Fix equipment_products RLS policies
-- ============================================

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
