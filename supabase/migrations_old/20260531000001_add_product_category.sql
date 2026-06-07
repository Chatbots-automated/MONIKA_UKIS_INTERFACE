-- Add 'hoof_care' to the product_category enum type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'hoof_care' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
    ) THEN
        ALTER TYPE product_category ADD VALUE 'hoof_care';
    END IF;
END $$;

-- Add index for category filtering if not exists
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Add comment
COMMENT ON COLUMN public.products.category IS 'Product category: medicines, prevention, vakcina, reproduction, treatment_materials, hygiene, biocide, technical, svirkstukai, bolusas, hoof_care';
