# Stock Deduction Issue When Editing Completed Visits - Analysis

## Issue Report
User reports that when editing a completed visit ("Redaguoti vizitą") and adding new medications, the stock doesn't get deducted. However, it works for the user reporting this.

## Investigation

### Code Flow Analysis

When editing a visit through "Redaguoti vizitą":

1. **VisitCreateModal opens** with `visitToEdit` prop containing the visit data
2. **User adds medications** to `treatmentData.medications` array
3. **handleSubmit() is called** when saving:
   - Line 2407-2428: Updates the visit record (status is preserved)
   - Line 2475-2512: Updates the treatment record
     - **Line 2510: DELETES ALL existing usage_items** for the treatment
     - **Line 2512: DELETES ALL existing treatment_medications**
   - Line 2576-2657: Loops through medications:
     - **Line 2628: Checks if `formData.status === 'Baigtas' || autoComplete`**
     - If YES: Creates `usage_items` (stock deduction happens here)
     - If NO: Only stores as `planned_medications` (no stock deduction)

### Key Condition for Stock Deduction

```javascript
if (formData.status === 'Baigtas' || autoComplete) {
  // Create usage_items - THIS DEDUCTS STOCK
  await supabase.from('usage_items').insert({
    treatment_id: treatmentRecord.id,
    product_id: med.product_id,
    batch_id: med.batch_id,
    qty: parseFloat(med.qty),
    unit: med.unit,
    purpose: med.purpose ? med.purpose : null,
    teat: med.teat || null,
  });
} else {
  // Only store as planned_medications - NO STOCK DEDUCTION
}
```

## Root Cause

The logic **SHOULD work correctly** when editing completed visits. Stock deduction should happen IF `formData.status` remains as `'Baigtas'`.

### Possible Reasons Why It Might Not Work for Some Users:

1. **Status field is editable in the UI** - User might accidentally change the status from "Baigtas" to another value when editing
   - This would cause the condition at line 2628 to fail
   - Medications would be stored as planned_medications instead of usage_items

2. **Visit status was not actually "Baigtas"** - User might think a visit is completed but it's actually marked as "Planuojamas" or another status

3. **Course medications** - If the medications are marked as multi-day courses (`is_course && course_days > 1`), they are NOT immediately deducted
   - Line 2602: Course medications only create `treatment_courses` records
   - Line 2625: "No immediate stock deduction" for courses

## Solution Implemented

### 1. Added Warning When Changing Status

When editing a completed visit, if the user tries to change the status from "Baigtas" to something else:
- **Confirmation dialog appears** warning that medications won't be deducted
- **Warning message shown below dropdown** reminding to keep status as "Baigtas"
- **Tooltip added** to the dropdown explaining the consequences

This prevents accidental status changes that would cause medications to not be deducted.

### 2. Improved Success Messages

After saving a visit, the success notification now indicates:
- "Vaistai nurašyti iš atsargų" - If medications were deducted from stock
- "Vaistai saugomi kaip planuojami (nebus nurašyti kol vizitas nebus užbaigtas)" - If medications were stored as planned only

This gives immediate feedback to the user about what happened with stock.

### 3. Added Debug Logging

Added comprehensive console.log statements to trace the issue:

- **At handleSubmit start** (line 2376): Shows edit mode, status, and medication count
- **Before processing medications** (line 2576): Shows status and whether stock will be deducted
- **For each medication** (line 2629 & 2654): Shows whether creating usage_items or storing as planned

### 2. How to Use Debug Logs

When the user reports the issue again, ask them to:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Redaguoti vizitą" on a completed visit
4. Add medications
5. Click save
6. Look for these logs:
   - `🚀 handleSubmit called:` - Check if `currentStatus` is "Baigtas"
   - `🔍 Processing medications:` - Check if `willDeductStock` is true
   - `✅ Creating usage_item (deducting stock):` or `⏸️ Visit not completed`

### 3. Database Trigger Note

The database trigger `process_visit_medications()` only fires when status **CHANGES TO** "Baigtas":

```sql
IF NEW.status = 'Baigtas'
   AND (OLD.status IS NULL OR OLD.status != 'Baigtas')
```

When editing a visit that's **already** "Baigtas", the trigger won't fire because the status doesn't change. This is intentional - the frontend handles stock deduction directly via usage_items creation.

## Recommendations

### For the User:

1. **Check the visit status** before editing - Make sure it shows "Baigtas"
2. **Don't change the status dropdown** when editing - Keep it as "Baigtas"
3. **Check browser console** for the debug logs to see what's happening
4. **Verify in Inventory** module after saving to confirm stock was deducted

### Potential UI Improvements:

1. **Make status readonly** when editing completed visits
2. **Add a warning message** if trying to add medications to a non-completed visit
3. **Show a confirmation** after saving: "Stock deducted: 50ml of Ovarelin from batch 754AA"
4. **Add visual indicator** showing which medications will deduct stock vs. planned

## Testing

To test the fix:

1. Find a completed visit (status = "Baigtas") with treatments
2. Click "Redaguoti vizitą"
3. Add a new medication with batch and quantity
4. **Check console logs** - should see "willDeductStock: true"
5. Save the visit
6. **Check console logs** - should see "✅ Creating usage_item (deducting stock)"
7. Go to Inventory module and verify the batch quantity decreased

## Files Modified

- `src/components/AnimalDetailSidebar.tsx`:
  - **Line 3344-3353**: Added confirmation dialog when changing status from "Baigtas"
  - **Line 3355**: Added tooltip to status dropdown
  - **Line 3363-3367**: Added warning message below status dropdown
  - **Line 3220-3236**: Improved success notification with stock deduction feedback
  - **Line 2376-2383**: Added debug logging at handleSubmit start
  - **Line 2576-2582**: Added debug logging before processing medications
  - **Line 2625, 2629-2654**: Added debug logging for each medication processing

## Additional Notes

The issue is most likely user behavior (changing status dropdown or editing non-completed visits) rather than a code bug. The debug logs will help confirm this.

If the logs show `willDeductStock: true` but stock still isn't deducted, then there's a database issue or the usage_items insert is failing silently.
