-- SQL to fix the unit enum issue and check database schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- PART 1: CHECK ALL TABLE SCHEMAS
-- ============================================

-- 1. Check products table structure
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 2. Check batches table structure
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'batches'
ORDER BY ordinal_position;

-- 3. Check usage_items table structure
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'usage_items'
ORDER BY ordinal_position;

-- ============================================
-- PART 2: CHECK AND FIX UNIT ENUM
-- ============================================

-- 4. Check if 'unit' enum type exists and show all its values
SELECT
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'unit'
ORDER BY e.enumsortorder;

-- 5. Add missing unit values to the enum
DO $$
BEGIN
    -- Check if 'unit' is an enum type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit') THEN
        RAISE NOTICE 'Unit enum exists, checking values...';

        -- Add 'vnt' if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'unit' AND e.enumlabel = 'vnt'
        ) THEN
            ALTER TYPE unit ADD VALUE IF NOT EXISTS 'vnt';
            RAISE NOTICE 'Added vnt to unit enum';
        ELSE
            RAISE NOTICE 'vnt already exists in unit enum';
        END IF;

        -- Add 'tablet' if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'unit' AND e.enumlabel = 'tablet'
        ) THEN
            ALTER TYPE unit ADD VALUE IF NOT EXISTS 'tablet';
            RAISE NOTICE 'Added tablet to unit enum';
        END IF;

        -- Add 'bolus' if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'unit' AND e.enumlabel = 'bolus'
        ) THEN
            ALTER TYPE unit ADD VALUE IF NOT EXISTS 'bolus';
            RAISE NOTICE 'Added bolus to unit enum';
        END IF;

        -- Add 'syringe' if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'unit' AND e.enumlabel = 'syringe'
        ) THEN
            ALTER TYPE unit ADD VALUE IF NOT EXISTS 'syringe';
            RAISE NOTICE 'Added syringe to unit enum';
        END IF;

    ELSE
        RAISE NOTICE 'unit is not an enum type, no action needed';
    END IF;
END $$;

-- 6. Verify all enum values after fix
SELECT
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'unit'
ORDER BY e.enumsortorder;

-- ============================================
-- PART 3: VERIFY DATA
-- ============================================

-- 7. Check sample products (using id instead of product_id)
SELECT
    id,
    name,
    category,
    primary_pack_unit,
    primary_pack_size,
    is_active
FROM products
LIMIT 10;

-- 8. Check inventory calculation
SELECT
    b.id as batch_id,
    p.name as product_name,
    b.lot,
    b.received_qty,
    COALESCE(SUM(u.qty), 0) as total_used,
    (b.received_qty - COALESCE(SUM(u.qty), 0)) as on_hand,
    p.primary_pack_unit as unit
FROM batches b
LEFT JOIN products p ON p.id = b.product_id
LEFT JOIN usage_items u ON u.batch_id = b.id
GROUP BY b.id, p.name, p.id, b.lot, b.received_qty, p.primary_pack_unit
HAVING (b.received_qty - COALESCE(SUM(u.qty), 0)) > 0
ORDER BY p.name
LIMIT 10;
