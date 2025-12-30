/*
  # Fix Vaccination Stock Deduction

  ## Problem
  Vaccinations are not being deducted from stock in the Inventory (atsargos) tab because:
  - Inventory calculates stock as: received_qty - sum(usage_items.qty)
  - Treatments create usage_items records → Stock gets deducted ✅
  - Vaccinations do NOT create usage_items records → Stock does NOT get deducted ❌

  However, vaccinations ARE tracked correctly in the "vaistų panaudojimas" section
  because that component reads from both usage_items AND vaccinations tables.

  ## Solution
  Create a database trigger that automatically creates usage_items records
  whenever a vaccination is inserted. This ensures:
  1. Stock is properly deducted in the Inventory tab
  2. Consistent inventory tracking across all product usage types
  3. No double-counting in ProductUsageAnalysis

  ## Changes
  1. Add vaccination_id column to usage_items to track the relationship
  2. Create function to generate usage_items from vaccinations
  3. Create trigger to call this function on vaccination INSERT
  4. Backfill existing vaccinations to create usage_items
*/

-- Add vaccination_id column to usage_items to track which vaccinations have been converted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_items' AND column_name = 'vaccination_id'
  ) THEN
    ALTER TABLE public.usage_items
    ADD COLUMN vaccination_id uuid REFERENCES public.vaccinations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_usage_items_vaccination_id ON public.usage_items(vaccination_id);
  END IF;
END $$;

-- Function to create usage_item when vaccination is inserted
CREATE OR REPLACE FUNCTION create_usage_item_from_vaccination()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create usage_item if we have a batch_id and dose_amount
  IF NEW.batch_id IS NOT NULL AND NEW.dose_amount IS NOT NULL AND NEW.dose_amount > 0 THEN

    -- Insert into usage_items with vaccination-specific purpose
    INSERT INTO usage_items (
      treatment_id,
      product_id,
      batch_id,
      qty,
      unit,
      purpose,
      vaccination_id,
      created_at
    ) VALUES (
      NULL,  -- vaccinations don't have treatment_id
      NEW.product_id,
      NEW.batch_id,
      NEW.dose_amount,
      NEW.unit,
      'vaccination',  -- Mark as vaccination for tracking
      NEW.id,  -- Link back to vaccination
      NEW.created_at
    );

    RAISE NOTICE 'Created usage_item for vaccination %. Product: %, Batch: %, Qty: % %',
      NEW.id,
      NEW.product_id,
      NEW.batch_id,
      NEW.dose_amount,
      NEW.unit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create usage_items when vaccination is inserted
DROP TRIGGER IF EXISTS trigger_create_usage_from_vaccination ON public.vaccinations;
CREATE TRIGGER trigger_create_usage_from_vaccination
  AFTER INSERT ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION create_usage_item_from_vaccination();

-- Backfill existing vaccinations to create usage_items
-- Only process vaccinations that don't already have a usage_item
INSERT INTO usage_items (
  treatment_id,
  product_id,
  batch_id,
  qty,
  unit,
  purpose,
  vaccination_id,
  created_at
)
SELECT
  NULL,  -- vaccinations don't have treatment_id
  v.product_id,
  v.batch_id,
  v.dose_amount,
  v.unit,
  'vaccination',
  v.id,
  v.created_at
FROM vaccinations v
WHERE v.batch_id IS NOT NULL
  AND v.dose_amount IS NOT NULL
  AND v.dose_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM usage_items ui
    WHERE ui.vaccination_id = v.id
  );

-- Add helpful comments
COMMENT ON COLUMN usage_items.vaccination_id IS 'Links to the vaccination record if this usage_item was created from a vaccination';
COMMENT ON FUNCTION create_usage_item_from_vaccination IS 'Automatically creates usage_items record when vaccination is inserted to ensure stock is properly deducted';
COMMENT ON TRIGGER trigger_create_usage_from_vaccination ON public.vaccinations IS 'Ensures vaccinations are deducted from inventory by creating usage_items records';
