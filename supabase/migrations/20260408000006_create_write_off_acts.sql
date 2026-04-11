-- Create write-off acts (nurašymo aktai) system
-- This tracks products that have been used/consumed over a period

-- Main write-off acts table
CREATE TABLE IF NOT EXISTS public.write_off_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_number TEXT NOT NULL UNIQUE, -- Auto-generated: "NA-2026-001"
  act_date DATE NOT NULL, -- Date of the act
  period_start DATE NOT NULL, -- Period covered (e.g., month start)
  period_end DATE NOT NULL, -- Period covered (e.g., month end)
  department TEXT, -- 'technika', 'veterinarija', 'ferma', 'sandelys', etc.
  module TEXT NOT NULL CHECK (module IN ('technika', 'veterinarija')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Write-off act items (products used)
CREATE TABLE IF NOT EXISTS public.write_off_act_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES public.write_off_acts(id) ON DELETE CASCADE,
  product_id UUID, -- equipment_products or products
  product_name TEXT NOT NULL,
  product_code TEXT,
  category_name TEXT, -- For grouping
  unit_type TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL CHECK (quantity_used > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  batch_id UUID, -- Reference to batch (equipment_batches or batches)
  batch_number TEXT,
  line_number INTEGER, -- For ordering within category
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_write_off_acts_module ON public.write_off_acts(module);
CREATE INDEX idx_write_off_acts_status ON public.write_off_acts(status);
CREATE INDEX idx_write_off_acts_period ON public.write_off_acts(period_start, period_end);
CREATE INDEX idx_write_off_acts_created_by ON public.write_off_acts(created_by);
CREATE INDEX idx_write_off_act_items_act_id ON public.write_off_act_items(act_id);
CREATE INDEX idx_write_off_act_items_product_id ON public.write_off_act_items(product_id);
CREATE INDEX idx_write_off_act_items_batch_id ON public.write_off_act_items(batch_id);

-- Function to generate act number
CREATE OR REPLACE FUNCTION generate_write_off_act_number(p_module TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_act_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Count existing acts for this year and module
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.write_off_acts
  WHERE act_number LIKE 'NA-' || v_year || '-' || p_module || '-%';
  
  -- Generate act number: NA-2026-technika-001
  v_act_number := 'NA-' || v_year || '-' || p_module || '-' || LPAD(v_count::TEXT, 3, '0');
  
  RETURN v_act_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update total amount when items change
CREATE OR REPLACE FUNCTION update_write_off_act_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.write_off_acts
  SET 
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.write_off_act_items
      WHERE act_id = COALESCE(NEW.act_id, OLD.act_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.act_id, OLD.act_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update total amount
CREATE TRIGGER trigger_update_write_off_act_total
AFTER INSERT OR UPDATE OR DELETE ON public.write_off_act_items
FOR EACH ROW
EXECUTE FUNCTION update_write_off_act_total();

-- Function to prevent editing approved acts
CREATE OR REPLACE FUNCTION prevent_edit_approved_write_off_act()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'approved' THEN
    RAISE EXCEPTION 'Cannot edit approved write-off act. Create a new act or cancel this one.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent editing approved acts
CREATE TRIGGER trigger_prevent_edit_approved_write_off_act
BEFORE UPDATE ON public.write_off_acts
FOR EACH ROW
EXECUTE FUNCTION prevent_edit_approved_write_off_act();

-- RLS Policies
ALTER TABLE public.write_off_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.write_off_act_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all write-off acts
DROP POLICY IF EXISTS "Allow authenticated users to view write-off acts" ON public.write_off_acts;
CREATE POLICY "Allow authenticated users to view write-off acts"
ON public.write_off_acts FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to view all write-off act items
DROP POLICY IF EXISTS "Allow authenticated users to view write-off act items" ON public.write_off_act_items;
CREATE POLICY "Allow authenticated users to view write-off act items"
ON public.write_off_act_items FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create write-off acts
DROP POLICY IF EXISTS "Allow authenticated users to create write-off acts" ON public.write_off_acts;
CREATE POLICY "Allow authenticated users to create write-off acts"
ON public.write_off_acts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to create write-off act items
DROP POLICY IF EXISTS "Allow authenticated users to create write-off act items" ON public.write_off_act_items;
CREATE POLICY "Allow authenticated users to create write-off act items"
ON public.write_off_act_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own draft write-off acts
DROP POLICY IF EXISTS "Allow users to update draft write-off acts" ON public.write_off_acts;
CREATE POLICY "Allow users to update draft write-off acts"
ON public.write_off_acts FOR UPDATE
TO authenticated
USING (status = 'draft' OR created_by = auth.uid());

-- Allow users to update items of draft write-off acts
DROP POLICY IF EXISTS "Allow users to update draft write-off act items" ON public.write_off_act_items;
CREATE POLICY "Allow users to update draft write-off act items"
ON public.write_off_act_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.write_off_acts
    WHERE id = act_id AND (status = 'draft' OR created_by = auth.uid())
  )
);

-- Allow users to delete draft write-off acts
DROP POLICY IF EXISTS "Allow users to delete draft write-off acts" ON public.write_off_acts;
CREATE POLICY "Allow users to delete draft write-off acts"
ON public.write_off_acts FOR DELETE
TO authenticated
USING (status = 'draft' AND created_by = auth.uid());

-- Allow users to delete items from draft write-off acts
DROP POLICY IF EXISTS "Allow users to delete draft write-off act items" ON public.write_off_act_items;
CREATE POLICY "Allow users to delete draft write-off act items"
ON public.write_off_act_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.write_off_acts
    WHERE id = act_id AND status = 'draft' AND created_by = auth.uid()
  )
);

-- Grant permissions
GRANT ALL ON public.write_off_acts TO authenticated;
GRANT ALL ON public.write_off_act_items TO authenticated;

-- Comments
COMMENT ON TABLE public.write_off_acts IS 'Write-off acts (Nurašymo aktai) for tracking used/consumed products';
COMMENT ON TABLE public.write_off_act_items IS 'Individual items in write-off acts';
COMMENT ON COLUMN public.write_off_acts.act_number IS 'Auto-generated unique act number (e.g., NA-2026-technika-001)';
COMMENT ON COLUMN public.write_off_acts.period_start IS 'Start date of the period covered by this act';
COMMENT ON COLUMN public.write_off_acts.period_end IS 'End date of the period covered by this act';
COMMENT ON COLUMN public.write_off_acts.status IS 'Status: draft (editable), approved (locked), cancelled';
