# Manual Fix Required: Cancel Existing APSĖK Synchronization Protocols

## Problem
The database trigger we created only fires when the GEA status **changes** to APSĖK. 
Animals that already have APSĖK status before the trigger was created still have active synchronization protocols.

## Solution Steps

### Step 1: Apply the Migration
The migration file has been created at:
`supabase/migrations/20251128000000_auto_cancel_sync_on_apsek.sql`

You need to apply this migration to your database first.

### Step 2: Run One-Time Cleanup Script
After applying the migration, run this SQL script in your Supabase SQL Editor:

```sql
-- One-time cleanup: Cancel all active synchronization protocols 
-- for animals that already have APSEK status

DO $$
DECLARE
  v_animal_record RECORD;
  v_cancelled_count INTEGER;
  v_total_cancelled INTEGER := 0;
BEGIN
  -- Find all animals with APSEK status
  FOR v_animal_record IN
    SELECT DISTINCT animal_id
    FROM gea_daily
    WHERE statusas = 'APSĖK'
  LOOP
    -- Cancel protocols for each animal
    SELECT cancel_animal_synchronization_protocols(v_animal_record.animal_id)
    INTO v_cancelled_count;
    
    IF v_cancelled_count > 0 THEN
      v_total_cancelled := v_total_cancelled + v_cancelled_count;
      RAISE NOTICE 'Cancelled % protocol(s) for animal %', v_cancelled_count, v_animal_record.animal_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total protocols cancelled: %', v_total_cancelled;
END $$;
```

### Step 3: Verify
After running the cleanup script:
1. Navigate to the animal "LT000044225432"
2. Check the Vizitai tab
3. All synchronization-related visits should now show status "Atšauktas" (Cancelled)
4. No medication should be deducted from stock for the cancelled visits

## How It Works Going Forward

Once the migration is applied:
- When any animal's GEA status changes to APSĖK, the database trigger automatically cancels all active synchronization protocols
- Completed visits keep their medication deductions
- Pending visits are cancelled without deducting stock
- Users see a notification in the UI
- The system prevents creating new protocols for animals with APSĖK status

## Testing

To test the automatic cancellation:
1. Find an animal with an active synchronization protocol
2. Update that animal's GEA status to 'APSĖK' (either manually or through normal data sync)
3. The trigger should automatically cancel the protocol
4. The user should see a notification in the UI
5. Visits should be marked as "Atšauktas"
