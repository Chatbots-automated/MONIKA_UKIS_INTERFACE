-- SQL to check and fix the unit enum issue
-- Run this in your Supabase SQL Editor

-- 1. Check the data type of primary_pack_unit
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'products'
    AND column_name = 'primary_pack_unit';

-- 2. If it's an enum type, check what values are allowed
SELECT
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'unit'
ORDER BY e.enumsortorder;

-- 3. If 'vnt' is missing, add it to the enum
-- (Only run this if the above query shows 'vnt' is not in the list)
DO $$
BEGIN
    -- Check if 'unit' is an enum type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit') THEN
        -- Add 'vnt' if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'unit' AND e.enumlabel = 'vnt'
        ) THEN
            ALTER TYPE unit ADD VALUE 'vnt';
            RAISE NOTICE 'Added vnt to unit enum';
        ELSE
            RAISE NOTICE 'vnt already exists in unit enum';
        END IF;
    ELSE
        RAISE NOTICE 'unit is not an enum type';
    END IF;
END $$;

-- 4. If primary_pack_unit is just text/varchar (not an enum), no action needed
-- The application will handle validation

-- 5. Alternative: If unit is an enum and causing issues, convert to text
-- WARNING: Only run this if you want to remove the enum constraint entirely
/*
ALTER TABLE products
ALTER COLUMN primary_pack_unit TYPE text;

DROP TYPE IF EXISTS unit CASCADE;
*/

-- 6. Verify the fix worked
SELECT
    product_id,
    name,
    primary_pack_unit
FROM products
WHERE primary_pack_unit IS NOT NULL
LIMIT 10;
