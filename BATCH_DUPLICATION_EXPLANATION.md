# Batch Duplication in Write-Off Acts - Explanation & Solution

## The Problem

When viewing write-off acts, you noticed that some batches appeared multiple times with the **same batch number** but **different prices and quantities**. For example:

```
Row 18: Balzamas tešmeniui 900g, batch BE0311 - 9000g, €0.00, total €14.00
Row 19: Balzamas tešmeniui 900g, batch BE0311 - 9000g, €0.02, total €140.00

Row 20: CAI-PANMINT, batch 2504995 - 6000ml, €0.00, total €20.99
Row 21: CAI-PANMINT, batch 2504995 - 6000ml, €0.03, total €152.39
Row 22: CAI-PANMINT, batch 2504995 - 6000ml, €0.02, total €125.94
```

## Root Cause

**This is NOT a bug in the code!** This is actually **correct behavior** based on your database structure:

### Your database has MULTIPLE PHYSICAL BATCHES with the SAME batch_number string

Here's what's happening:

1. **Batch numbers come from suppliers** - They are just text strings (e.g., "BE0311", "2504995")
2. **Multiple deliveries can have the same batch number** - The supplier might send multiple shipments with identical batch numbers
3. **Each physical batch has a unique `batch_id`** in your database (primary key)
4. **Each physical batch can have different prices** - Different invoices, different dates, different suppliers

### Example from your data:

```
Batch ID: abc-123 | Batch Number: "BE0311" | Price: €0.00 | Received: 9000g | Invoice: #1234
Batch ID: def-456 | Batch Number: "BE0311" | Price: €0.02 | Received: 9000g | Invoice: #5678
```

These are **TWO DIFFERENT PHYSICAL BATCHES** that happen to have the same batch number from the supplier!

## The Solution - Two Options

I've created **two different functions** so you can choose how to display this data:

### Option 1: Detailed View (Current - `populate_write_off_act`)
**Shows each physical batch separately**

✅ **Advantages:**
- Complete audit trail
- Shows exact price paid for each batch
- Shows exact usage from each specific delivery
- Most accurate for accounting

❌ **Disadvantages:**
- Can look confusing when batch numbers repeat
- Longer reports

### Option 2: Combined View (New - `populate_write_off_act_combined`)
**Merges batches with the same batch_number**

✅ **Advantages:**
- Cleaner, shorter reports
- One line per batch number
- Uses weighted average price
- Adds note showing how many physical batches were combined

❌ **Disadvantages:**
- Less detailed audit trail
- Average price might not match any specific invoice

## How to Use

### In the UI:
1. Expand a write-off act (draft status)
2. You'll see a checkbox: **"Sujungti partijas su tuo pačiu numeriu"**
3. **Checked (default)**: Uses combined view - merges same batch numbers
4. **Unchecked**: Uses detailed view - shows each physical batch separately
5. Click "Atnaujinti iš naujo" to regenerate the act with your chosen option

### Combined View Features:
- Shows total usage across all batches with same number
- Calculates weighted average price
- Shows total received quantity (sum of all batches)
- Shows total remaining quantity (sum of all batches)
- Adds note: "X partijos su tuo pačiu numeriu" (X batches with same number)

## Example Output - Combined View

```
Product: Balzamas tešmeniui 900g
Batch: BE0311
Used: 18000g (from 2 batches)
Remaining: 0g
Avg Price: €0.01
Total: €154.00
Note: 2 partijos su tuo pačiu numeriu
```

## Recommendation

For **official accounting reports**: Use **Combined View** (checkbox ON)
- Cleaner presentation
- Easier for auditors to read
- Still shows note when batches are combined

For **internal audits**: Use **Detailed View** (checkbox OFF)
- Full traceability
- See exact invoice prices
- Track specific deliveries

## Technical Details

### Migration File
- `20260408000021_combine_same_batch_numbers.sql`

### Key SQL Changes
```sql
-- Combined function groups by batch_number instead of batch_id
GROUP BY p.id, p.name, p.category, p.unit_type, b.batch_number

-- Uses weighted average for price
SUM(qty * price) / SUM(qty) as weighted_avg_price

-- Adds note when multiple batches combined
CASE WHEN COUNT(DISTINCT b.id) > 1 
THEN COUNT(DISTINCT b.id)::TEXT || ' partijos su tuo pačiu numeriu'
END
```

### UI Changes
- Added `combineBatches` state toggle
- Added checkbox with tooltip
- Dynamic function selection based on toggle
- Display notes field in item rows

## Next Steps

1. **Apply the migration**: `20260408000021_combine_same_batch_numbers.sql`
2. **Test both views**: Create a new write-off act and try both options
3. **Choose your default**: Decide which view you prefer for official reports
4. **Verify totals**: Ensure the combined view totals match the detailed view

## Questions to Consider

1. **Is this expected?** - Do your suppliers reuse batch numbers across deliveries?
2. **Should we track this better?** - Would you like to add delivery date or invoice number to batch display?
3. **Export format** - Should the CSV export also respect the combined/detailed toggle?
