/*
  # Fix Insemination RLS Policies for Custom Auth

  ## Problem
  The insemination tables have RLS policies that use `TO authenticated`
  which only works with Supabase Auth. This system uses custom authentication,
  so these policies are blocking access to the products.

  ## Solution
  Run this SQL in your Supabase SQL Editor to fix the RLS policies.

  ## Instructions
  1. Go to your Supabase Dashboard
  2. Navigate to SQL Editor
  3. Paste and run this entire SQL script
  4. Refresh your application
  5. Products should now be visible
*/

-- Drop existing policies for insemination_products
DROP POLICY IF EXISTS "Authenticated users can view insemination products" ON insemination_products;
DROP POLICY IF EXISTS "Authenticated users can insert insemination products" ON insemination_products;
DROP POLICY IF EXISTS "Authenticated users can update insemination products" ON insemination_products;
DROP POLICY IF EXISTS "Authenticated users can delete insemination products" ON insemination_products;

-- Drop existing policies for insemination_inventory
DROP POLICY IF EXISTS "Authenticated users can view insemination inventory" ON insemination_inventory;
DROP POLICY IF EXISTS "Authenticated users can insert insemination inventory" ON insemination_inventory;
DROP POLICY IF EXISTS "Authenticated users can update insemination inventory" ON insemination_inventory;
DROP POLICY IF EXISTS "Authenticated users can delete insemination inventory" ON insemination_inventory;

-- Drop existing policies for insemination_records
DROP POLICY IF EXISTS "Authenticated users can view insemination records" ON insemination_records;
DROP POLICY IF EXISTS "Authenticated users can insert insemination records" ON insemination_records;
DROP POLICY IF EXISTS "Authenticated users can update insemination records" ON insemination_records;
DROP POLICY IF EXISTS "Authenticated users can delete insemination records" ON insemination_records;

-- Create new policies for insemination_products
CREATE POLICY "Users can view insemination products"
  ON insemination_products FOR SELECT
  USING (true);

CREATE POLICY "Users can insert insemination products"
  ON insemination_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update insemination products"
  ON insemination_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete insemination products"
  ON insemination_products FOR DELETE
  USING (true);

-- Create new policies for insemination_inventory
CREATE POLICY "Users can view insemination inventory"
  ON insemination_inventory FOR SELECT
  USING (true);

CREATE POLICY "Users can insert insemination inventory"
  ON insemination_inventory FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update insemination inventory"
  ON insemination_inventory FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete insemination inventory"
  ON insemination_inventory FOR DELETE
  USING (true);

-- Create new policies for insemination_records
CREATE POLICY "Users can view insemination records"
  ON insemination_records FOR SELECT
  USING (true);

CREATE POLICY "Users can insert insemination records"
  ON insemination_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update insemination records"
  ON insemination_records FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete insemination records"
  ON insemination_records FOR DELETE
  USING (true);
