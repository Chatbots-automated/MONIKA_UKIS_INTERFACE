# 🚨 IMPORTANT: Database Fix Required

## What You Need to Do

1. **Open Supabase SQL Editor**
   - Go to your Supabase dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run the Fix Script**
   - Open the file `APPLY_THIS_SQL_FIX.sql` from this project
   - Copy the entire contents
   - Paste it into the Supabase SQL Editor
   - Click "Run" button

3. **Done!**
   - The script will output messages showing which animals were fixed
   - Check animal "LT000044225432" - the visits should now be cancelled

## What This Does

### Fixes Existing Data
- Cancels all active synchronization protocols for animals that already have APSĖK status
- Marks their pending visits as "Atšauktas" (Cancelled)
- Does NOT deduct medicine from stock for cancelled visits

### Sets Up Automatic Future Handling
- Creates a database trigger that watches for GEA status changes
- Automatically cancels protocols when ANY animal's status becomes APSĖK
- Works in real-time, no manual intervention needed going forward

## Why This is Needed

The UI shows the warning "Visi aktyvūs sinchronizacijos protokolai automatiškai atšaukiami" but the database trigger wasn't actually created yet. This script creates the trigger AND fixes all existing data in one go.

## Questions?

See `MANUAL_FIX_INSTRUCTIONS.md` for detailed technical information.
