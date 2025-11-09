-- SQL to check all tables in your Supabase database
-- Run this in your Supabase SQL Editor

-- 1. List all tables
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check batches table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'batches'
ORDER BY ordinal_position;

-- 3. Check if package tracking columns exist in batches
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'batches'
    AND column_name IN ('id', 'product_id', 'received_qty', 'package_size', 'package_count', 'lot', 'expiry_date')
ORDER BY column_name;

-- 4. Check usage_items table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'usage_items'
ORDER BY ordinal_position;

-- 5. Check products table structure (for primary_pack_size and primary_pack_unit)
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
    AND column_name IN ('product_id', 'name', 'category', 'primary_pack_size', 'primary_pack_unit')
ORDER BY column_name;

-- 6. Sample data from batches to verify package tracking
SELECT
    id,
    product_id,
    lot,
    received_qty,
    package_size,
    package_count,
    expiry_date
FROM batches
LIMIT 5;

-- 7. Sample data from usage_items
SELECT
    id,
    batch_id,
    product_id,
    qty,
    visit_id,
    created_at
FROM usage_items
ORDER BY created_at DESC
LIMIT 5;

-- 8. Calculate inventory on-hand for each batch
SELECT
    b.id as batch_id,
    p.name as product_name,
    b.lot,
    b.received_qty,
    COALESCE(SUM(u.qty), 0) as total_used,
    (b.received_qty - COALESCE(SUM(u.qty), 0)) as on_hand,
    b.package_size,
    b.package_count,
    b.expiry_date
FROM batches b
LEFT JOIN products p ON p.product_id = b.product_id
LEFT JOIN usage_items u ON u.batch_id = b.id
GROUP BY b.id, p.name, b.lot, b.received_qty, b.package_size, b.package_count, b.expiry_date
HAVING (b.received_qty - COALESCE(SUM(u.qty), 0)) > 0
ORDER BY p.name, b.expiry_date;
