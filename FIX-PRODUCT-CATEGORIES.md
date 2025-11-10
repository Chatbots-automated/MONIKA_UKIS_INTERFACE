# Fix Product Categories Enum Error

## Problem
When creating products with categories "svirkstukai", "bolusas", or "vakcina", you get this error:
```
Klaida: invalid input value for enum product_category: "svirkstukai"
```

## Solution
These values need to be added to the `product_category` enum in your database.

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the following SQL:

```sql
-- Add svirkstukai
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'svirkstukai'
    AND enumtypid = 'product_category'::regtype
  ) THEN
    ALTER TYPE product_category ADD VALUE 'svirkstukai';
  END IF;
END $$;

-- Add bolusas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'bolusas'
    AND enumtypid = 'product_category'::regtype
  ) THEN
    ALTER TYPE product_category ADD VALUE 'bolusas';
  END IF;
END $$;

-- Add vakcina
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'vakcina'
    AND enumtypid = 'product_category'::regtype
  ) THEN
    ALTER TYPE product_category ADD VALUE 'vakcina';
  END IF;
END $$;
```

5. Click "Run" (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned" - this is correct!

### Option 2: Run each value separately

If the above doesn't work, try running each block separately (one at a time):

**Step 1 - Add svirkstukai:**
```sql
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'svirkstukai';
```

**Step 2 - Add bolusas:**
```sql
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'bolusas';
```

**Step 3 - Add vakcina:**
```sql
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'vakcina';
```

## Verify the Fix

After applying the SQL, you can verify the enum values exist by running:

```sql
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'product_category'::regtype
ORDER BY enumsortorder;
```

You should see all the category values including 'svirkstukai', 'bolusas', and 'vakcina'.

## Test

After applying the fix, try creating a product with category "Švirkštukai" in your application. It should work without errors!
