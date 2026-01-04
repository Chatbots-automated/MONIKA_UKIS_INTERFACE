# How to Apply Treatment Milk Loss Migration

## Step 1: Open Supabase SQL Editor

Navigate to your Supabase SQL Editor:
https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new

## Step 2: Copy the SQL

Open the file: `treatment-milk-loss-migration.sql`

Copy ALL the contents (the entire file).

## Step 3: Paste and Execute

1. Paste the SQL into the Supabase SQL Editor
2. Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
3. Wait for execution to complete

## Step 4: Verify

After applying, run this test command:

```bash
node test-treatment-milk-loss.cjs
```

This will:
- Check if the functions were created successfully
- Show sample treatment milk loss data
- Display statistics about milk losses across your farm

## What Gets Created

**Functions:**
- `get_animal_avg_milk_at_date(animal_id, date)` - Gets 30-day average milk production
- `calculate_treatment_milk_loss(treatment_id)` - Calculates milk loss for a treatment

**View:**
- `treatment_milk_loss_summary` - Shows all treatments with milk losses and medications

## Expected Result

You should see output like:
```
✅ View works! Found X treatments with milk loss data

📊 Sample Treatment Milk Loss:
  Animal: LT000123
  Treatment Date: 2025-12-01
  Withdrawal Days: 5 + 1 safety = 6 total
  Avg Daily Milk: 45.5 kg/day
  Total Milk Lost: 273 kg
  Value Lost: €122.85

  Medications:
    - COBACTAN LC 8g, N15 (8 g)
      Withdrawal: 5d milk, 4d meat
```

## Troubleshooting

**Error: "function already exists"**
- This is OK! It means the functions are already created
- The migration is idempotent and safe to run multiple times

**Error: "view already exists"**
- This is OK! The view will be recreated with the latest definition

**Error: "permission denied"**
- Make sure you're logged in as the project owner
- Or use the service role key

## After Migration

The system will be immediately available in:
1. **Gydymų Savikainos → Karencija** tab (farm-wide view)
2. **Animal detail → Pieno Nuostoliai** button (per-animal view)

No code deployment needed - just refresh your browser!
