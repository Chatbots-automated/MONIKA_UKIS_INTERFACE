-- Test to verify all animals in group 8 are being loaded

-- 1. Count animals in group 8 from GEA data
SELECT 
    '=== TOTAL ANIMALS IN GROUP 8 (from GEA) ===' as section;

SELECT 
    COUNT(*) as total_in_gea
FROM gea_daily_ataskaita1 a1
WHERE a1.group_number = '8'
    AND a1.import_id = (
        SELECT id FROM gea_daily_imports 
        ORDER BY created_at DESC 
        LIMIT 1
    );

-- 2. Count active animals in group 8 that exist in our animals table
SELECT 
    '=== ACTIVE ANIMALS IN GROUP 8 (in our database) ===' as section;

SELECT 
    COUNT(*) as total_active_animals
FROM animals a
WHERE a.active = true
    AND a.tag_no IN (
        SELECT ear_number 
        FROM gea_daily_ataskaita1 a1
        WHERE a1.group_number = '8'
            AND a1.import_id = (
                SELECT id FROM gea_daily_imports 
                ORDER BY created_at DESC 
                LIMIT 1
            )
    );

-- 3. Show sample of animals in group 8
SELECT 
    '=== SAMPLE: Animals in Group 8 ===' as section;

SELECT 
    a.id,
    a.tag_no,
    a.species,
    a1.group_number
FROM animals a
JOIN gea_daily_ataskaita1 a1 ON a1.ear_number = a.tag_no
WHERE a.active = true
    AND a1.group_number = '8'
    AND a1.import_id = (
        SELECT id FROM gea_daily_imports 
        ORDER BY created_at DESC 
        LIMIT 1
    )
ORDER BY a.tag_no
LIMIT 10;

-- 4. Check total rows in gea_daily_ataskaita1 for latest import
SELECT 
    '=== TOTAL ROWS IN LATEST GEA IMPORT ===' as section;

SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT ear_number) as unique_animals,
    COUNT(DISTINCT group_number) as unique_groups
FROM gea_daily_ataskaita1
WHERE import_id = (
    SELECT id FROM gea_daily_imports 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 5. Count animals per group
SELECT 
    '=== ANIMALS PER GROUP ===' as section;

SELECT 
    a1.group_number,
    COUNT(*) as count
FROM gea_daily_ataskaita1 a1
WHERE a1.import_id = (
    SELECT id FROM gea_daily_imports 
    ORDER BY created_at DESC 
    LIMIT 1
)
GROUP BY a1.group_number
ORDER BY a1.group_number::int;
