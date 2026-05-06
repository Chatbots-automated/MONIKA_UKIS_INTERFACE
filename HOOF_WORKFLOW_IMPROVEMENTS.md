# Hoof Examination Workflow Improvements

## New Features Added - 2026-05-06

### 1. 🎯 Auto-Select Newest Batch with Stock

**What it does**: When you select a product for treatment, the system now automatically selects the most appropriate batch.

**Logic**:
- Filters batches by:
  - Matching product ID
  - Has stock remaining (`qty_left > 0` or `null`)
  - Not expired (`expiry_date >= today`)
- Sorts batches by expiry date **descending** (newest/latest expiry first)
- **Automatically selects the first batch** (the one with the latest expiry = newest stock)

**Why**: This matches the behavior in "Vienkartinis gydymas" and uses LIFO (Last In, First Out) for medications, which is appropriate for veterinary products where you want to use the freshest stock.

**Code location**: `Hoofs3D.tsx`, lines ~797-818

### 2. 🔄 Multi-Selection Workflow

**What it does**: You can now examine multiple legs, claws, and zones in a single session.

**How it works**:
1. Select a cow
2. Click on a leg (FL, FR, HL, HR) in 3D view
3. Click on a claw (inner/outer)
4. Click on a zone (0-10)
5. Fill in examination details and click "Išsaugoti"
6. **Automatically returns to cow view** so you can select another leg
7. Repeat steps 2-5 for as many legs/claws/zones as needed
8. All examinations are stored in memory
9. Click "Išsaugoti visas" to save everything to database

**Benefits**:
- Examine all 4 legs in one session
- Examine multiple zones per leg
- Review all examinations before final save
- Edit or delete any examination before saving

### 3. ✏️ Edit Examinations Before Saving

**What it does**: You can click on any examination card to edit it.

**Features**:
- Click on examination card → Opens modal with existing data
- Edit any field (condition, severity, treatment, etc.)
- Save to update the examination in the list
- Delete button (X) on hover to remove examination
- "Išvalyti visas" button to clear all examinations

**Visual Design**:
- Green bordered cards with hover effects
- Shows: Leg, Claw, Zone, Condition, Severity, Treatment status
- Click to edit, hover for delete button
- Improved layout with gradient background

### 4. 🔍 Batch Filtering Improvements

**What changed**:
- Batches are now sorted by expiry date (newest first) in dropdown
- Expired batches are **filtered out** automatically
- Only shows batches with stock remaining
- Removed duplicate batches in dropdown
- Better display format showing stock levels and units

**Display format**:
```
LOT123 - Likutis: 150 ml (galioja iki: 2026-12-31)
```

### 5. 📊 Improved Examination List Display

**Features**:
- Gradient blue-to-green background
- Clear count of examinations added
- Zone badges with blue highlight
- "Gydyta" indicator for treated examinations
- Click card to edit
- Hover to see delete button
- "Išvalyti visas" to clear all
- Helpful tip at bottom

**Visual indicators**:
- ✓ Green checkmark icon in header
- Green borders on examination cards
- Blue zone badges
- Red delete buttons on hover

## Complete Workflow Example

### Examining Multiple Legs:

1. **Start**: Click "Nauja apžiūra"
2. **Select Animal**: Choose cow by tag/collar number
3. **Examine Front Left Inner**:
   - Click FL (Front Left) leg
   - Click "Inner" claw
   - Click Zone 3
   - Fill in: "Baltosios linijos liga", Severity 2, Treatment details
   - Click "Išsaugoti"
   - ✓ Returns to cow view automatically

4. **Examine Back Right Outer**:
   - Click HR (Hind Right) leg
   - Click "Outer" claw
   - Click Zone 7
   - Fill in: "Padės opinis", Severity 3, Treatment details
   - Product auto-selects newest batch
   - Click "Išsaugoti"
   - ✓ Returns to cow view automatically

5. **Review**: See both examinations in green cards below
6. **Edit if needed**: Click any card to edit
7. **Save All**: Click "Išsaugoti visas (2)" button
8. **Done**: All examinations saved to database, stock deducted

## Technical Details

### Auto-Batch Selection Algorithm

```tsx
const availableBatches = batches
  .filter(b => 
    b.product_id === productId && 
    (b.qty_left === null || b.qty_left === undefined || b.qty_left > 0) &&
    (!b.expiry_date || new Date(b.expiry_date) >= new Date())
  )
  .sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
  });

// Auto-select first (newest)
treatment_batch_id: availableBatches[0]?.id
```

### Multi-Selection State Management

- `currentExaminations: ClawExamination[]` - Array storing all examinations
- Each examination has unique key: `leg + claw + zone`
- Saved to database in batch when "Išsaugoti visas" clicked
- Stock deduction happens for each treated examination

### Navigation Flow

```
Cow View (select leg)
  ↓
Claw View (select claw)
  ↓
Zone View (select zone)
  ↓
Examination Modal (fill details)
  ↓ [Save]
Back to Cow View ← NEW! Automatic return
  ↓
[Repeat for more examinations]
  ↓
Save All → Database + Stock Deduction
```

## Benefits Summary

1. **Faster workflow**: Auto-batch selection saves clicks
2. **Multi-examination**: Examine all 4 legs without saving between
3. **Review capability**: See all examinations before committing
4. **Edit flexibility**: Change any examination before final save
5. **Better UX**: Visual feedback, clear navigation, helpful messages
6. **Inventory accuracy**: Uses newest stock, filters expired batches
7. **Data integrity**: All examinations saved atomically

## Files Modified

1. `src/components/Hoofs3D.tsx`
   - Auto-batch selection logic
   - Multi-examination workflow
   - Improved examination display
   - Edit examination functionality
   - Auto-return to cow view
   - Batch filtering and sorting

## Migration Required

Don't forget to run: `supabase/migrations/20260506000002_fix_hoof_records_rls_for_custom_auth.sql`

This fixes the RLS policies to allow your custom auth (anon role) to insert records.
