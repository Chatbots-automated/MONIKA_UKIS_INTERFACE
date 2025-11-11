-- ===================================================================
-- FIX RLS POLICIES FOR INVOICE_ITEMS
-- ===================================================================
-- The system uses custom authentication (not Supabase Auth)
-- RLS policies need to allow anon users to insert/update data
-- ===================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view all invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete invoice items" ON invoice_items;

-- Create permissive policies that work with custom auth
CREATE POLICY "Allow all operations on invoice_items"
  ON invoice_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Do the same for invoices table to be safe
DROP POLICY IF EXISTS "Users can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

CREATE POLICY "Allow all operations on invoices"
  ON invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- DONE! Copy this SQL and run it in Supabase SQL Editor
-- ===================================================================
