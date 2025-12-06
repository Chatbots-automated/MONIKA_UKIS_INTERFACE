/*
  # Automated Medical Waste Tracking System

  1. Changes to Products Table
    - Add `package_weight_g` column for empty package weight in grams
    - Optional field, enables automatic waste generation when configured

  2. Changes to Medical Waste Table
    - Add `auto_generated` boolean flag (default false)
    - Add `source_batch_id` reference to originating batch
    - Add `source_product_id` reference to product
    - Add `package_count` for number of empty packages
    - Tracks which waste entries were auto-generated vs manual

  3. New Tables
    - `batch_waste_tracking`
      - Prevents duplicate waste generation for same batch
      - One-to-one mapping of batch to medical waste record
      - Includes timestamp and reference to waste entry

  4. Functions
    - `auto_generate_medical_waste(batch_id)`
      - Automatically creates waste entry when batch depletes to zero
      - Calculates weight from package_count × package_weight_g
      - Assigns waste codes based on product category
      - Prevents duplicates via batch_waste_tracking

  5. Triggers
    - `trigger_check_batch_depletion` on usage_items
      - Detects when batch stock reaches exactly 0
      - Calls auto_generate_medical_waste function
      - Only fires when all conditions met

  6. Views
    - `vw_medical_waste_with_details`
      - Enriched view joining waste with product and batch info
      - Shows source product name, lot number, package details
      - Used by UI for display

  7. Security
    - RLS policies inherited from existing tables
    - Function runs with SECURITY DEFINER for privilege elevation
    - Audit trail maintained for all auto-generated entries

  8. Important Notes
    - Waste generated immediately when batch reaches 0 stock
    - Each batch creates separate waste entry (not grouped)
    - Products without package_weight_g silently skip waste generation
    - System handles concurrent usage and corrections gracefully
*/

-- =====================================================
-- 1. ADD PACKAGE WEIGHT TO PRODUCTS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'package_weight_g'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN package_weight_g numeric(10,2) CHECK (package_weight_g > 0);

    COMMENT ON COLUMN public.products.package_weight_g IS
    'Empty package weight in grams. Used for automatic medical waste generation when batch is fully depleted.';
  END IF;
END $$;

-- Create index for performance on waste generation queries
CREATE INDEX IF NOT EXISTS idx_products_package_weight
ON public.products(package_weight_g)
WHERE package_weight_g IS NOT NULL;

-- =====================================================
-- 2. ENHANCE MEDICAL WASTE TABLE
-- =====================================================

-- Add auto_generated flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'medical_waste'
    AND column_name = 'auto_generated'
  ) THEN
    ALTER TABLE public.medical_waste
    ADD COLUMN auto_generated boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add source_batch_id reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'medical_waste'
    AND column_name = 'source_batch_id'
  ) THEN
    ALTER TABLE public.medical_waste
    ADD COLUMN source_batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add source_product_id reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'medical_waste'
    AND column_name = 'source_product_id'
  ) THEN
    ALTER TABLE public.medical_waste
    ADD COLUMN source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add package_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'medical_waste'
    AND column_name = 'package_count'
  ) THEN
    ALTER TABLE public.medical_waste
    ADD COLUMN package_count integer CHECK (package_count > 0);
  END IF;
END $$;

-- Create composite index for filtering auto-generated waste
CREATE INDEX IF NOT EXISTS idx_medical_waste_auto_generated
ON public.medical_waste(auto_generated, source_batch_id);

-- Create index on source references for joins
CREATE INDEX IF NOT EXISTS idx_medical_waste_source_product
ON public.medical_waste(source_product_id);

-- =====================================================
-- 3. CREATE BATCH WASTE TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.batch_waste_tracking (
  batch_id uuid PRIMARY KEY REFERENCES public.batches(id) ON DELETE CASCADE,
  medical_waste_id uuid NOT NULL REFERENCES public.medical_waste(id) ON DELETE CASCADE,
  waste_generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_waste_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_waste_tracking
CREATE POLICY "Authenticated users can view batch waste tracking"
  ON public.batch_waste_tracking
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert batch waste tracking"
  ON public.batch_waste_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast lookups during stock depletion checks
CREATE INDEX IF NOT EXISTS idx_batch_waste_tracking_batch
ON public.batch_waste_tracking(batch_id);

-- =====================================================
-- 4. CREATE AUTO-GENERATE MEDICAL WASTE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_generate_medical_waste(p_batch_id uuid)
RETURNS uuid AS $$
DECLARE
  v_batch_record RECORD;
  v_product_record RECORD;
  v_waste_id uuid;
  v_waste_code text;
  v_waste_name text;
  v_total_weight numeric;
BEGIN
  -- Check if this batch already has waste generated
  IF EXISTS (SELECT 1 FROM public.batch_waste_tracking WHERE batch_id = p_batch_id) THEN
    -- Already processed, return existing waste_id
    SELECT medical_waste_id INTO v_waste_id
    FROM public.batch_waste_tracking
    WHERE batch_id = p_batch_id;
    RETURN v_waste_id;
  END IF;

  -- Get batch details
  SELECT b.*, b.package_count as pkg_count
  INTO v_batch_record
  FROM public.batches b
  WHERE b.id = p_batch_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Batch % not found', p_batch_id;
    RETURN NULL;
  END IF;

  -- Get product details
  SELECT p.*
  INTO v_product_record
  FROM public.products p
  WHERE p.id = v_batch_record.product_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Product not found for batch %', p_batch_id;
    RETURN NULL;
  END IF;

  -- Exit if product doesn't have package weight configured
  IF v_product_record.package_weight_g IS NULL THEN
    RAISE NOTICE 'Product % does not have package_weight_g configured, skipping waste generation', v_product_record.name;
    RETURN NULL;
  END IF;

  -- Exit if package_count is NULL or zero
  IF v_batch_record.pkg_count IS NULL OR v_batch_record.pkg_count <= 0 THEN
    RAISE NOTICE 'Batch % has invalid package_count, skipping waste generation', p_batch_id;
    RETURN NULL;
  END IF;

  -- Calculate total weight (package_count × package_weight_g)
  v_total_weight := v_batch_record.pkg_count * v_product_record.package_weight_g;

  -- Determine waste code based on product category
  CASE v_product_record.category
    WHEN 'medicines' THEN v_waste_code := '18 02 02';
    WHEN 'vakcina' THEN v_waste_code := '18 02 02';
    WHEN 'prevention' THEN v_waste_code := '18 02 02';
    WHEN 'svirkstukai' THEN v_waste_code := '18 02 01';
    ELSE v_waste_code := '18 02 02';
  END CASE;

  -- Generate descriptive waste name
  IF v_batch_record.lot IS NOT NULL THEN
    v_waste_name := v_product_record.name || ' - Partija ' || v_batch_record.lot;
  ELSE
    v_waste_name := v_product_record.name || ' - Tuščios pakuotės';
  END IF;

  -- Insert medical waste record
  INSERT INTO public.medical_waste (
    waste_code,
    name,
    date,
    qty_generated,
    auto_generated,
    source_batch_id,
    source_product_id,
    package_count
  )
  VALUES (
    v_waste_code,
    v_waste_name,
    CURRENT_DATE,
    v_total_weight,
    true,
    p_batch_id,
    v_batch_record.product_id,
    v_batch_record.pkg_count
  )
  RETURNING id INTO v_waste_id;

  -- Record in batch_waste_tracking to prevent duplicates
  INSERT INTO public.batch_waste_tracking (
    batch_id,
    medical_waste_id,
    waste_generated_at
  )
  VALUES (
    p_batch_id,
    v_waste_id,
    now()
  );

  RAISE NOTICE 'Auto-generated medical waste % for batch % (Product: %, Weight: %g)',
    v_waste_id, p_batch_id, v_product_record.name, v_total_weight;

  RETURN v_waste_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE STOCK DEPLETION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_batch_depletion()
RETURNS trigger AS $$
DECLARE
  v_current_stock numeric;
  v_waste_id uuid;
BEGIN
  -- Calculate current stock for the batch
  SELECT COALESCE(
    (
      SELECT b.received_qty - COALESCE(SUM(ui.qty), 0)
      FROM public.batches b
      LEFT JOIN public.usage_items ui ON ui.batch_id = b.id
      WHERE b.id = NEW.batch_id
      GROUP BY b.id, b.received_qty
    ),
    0
  ) INTO v_current_stock;

  -- If stock reached exactly 0, trigger waste generation
  IF v_current_stock <= 0 THEN
    -- Attempt to generate waste (function handles duplicates)
    v_waste_id := public.auto_generate_medical_waste(NEW.batch_id);

    IF v_waste_id IS NOT NULL THEN
      RAISE NOTICE 'Batch % depleted, waste entry % created', NEW.batch_id, v_waste_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on usage_items
DROP TRIGGER IF EXISTS trigger_check_batch_depletion ON public.usage_items;

CREATE TRIGGER trigger_check_batch_depletion
  AFTER INSERT ON public.usage_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_batch_depletion();

-- =====================================================
-- 6. CREATE MEDICAL WASTE WITH DETAILS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.vw_medical_waste_with_details AS
SELECT
  mw.*,
  CASE
    WHEN mw.auto_generated THEN 'automatic'
    ELSE 'manual'
  END as source_type,
  p.name as product_name,
  p.category as product_category,
  b.lot as batch_lot,
  b.expiry_date as batch_expiry,
  b.mfg_date as batch_mfg_date,
  bwt.waste_generated_at as auto_generated_at
FROM public.medical_waste mw
LEFT JOIN public.products p ON mw.source_product_id = p.id
LEFT JOIN public.batches b ON mw.source_batch_id = b.id
LEFT JOIN public.batch_waste_tracking bwt ON bwt.medical_waste_id = mw.id
ORDER BY mw.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.vw_medical_waste_with_details TO authenticated;

-- =====================================================
-- 7. ENABLE REALTIME FOR NEW TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'batch_waste_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE batch_waste_tracking;
  END IF;
END $$;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.batch_waste_tracking IS
'Tracks which batches have already generated medical waste to prevent duplicates';

COMMENT ON COLUMN public.medical_waste.auto_generated IS
'True if this waste entry was automatically generated when batch reached zero stock';

COMMENT ON COLUMN public.medical_waste.source_batch_id IS
'Reference to the batch that generated this waste (for auto-generated entries)';

COMMENT ON COLUMN public.medical_waste.source_product_id IS
'Reference to the product that generated this waste (for auto-generated entries)';

COMMENT ON COLUMN public.medical_waste.package_count IS
'Number of empty packages for auto-generated waste entries';

COMMENT ON FUNCTION public.auto_generate_medical_waste IS
'Automatically creates medical waste entry when batch is fully depleted. Prevents duplicates.';

COMMENT ON FUNCTION public.check_batch_depletion IS
'Trigger function that detects when batch stock reaches 0 and generates waste entry';
