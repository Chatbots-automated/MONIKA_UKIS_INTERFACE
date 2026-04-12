# Animal Departures System (Išvežtų Gyvūnų Sistema)

## Overview

This system tracks animals that have been sent away from the farm and automatically checks if their departure date conflicts with their last recorded withdrawal periods (karencines dienos).

## Problem Statement

**Current Situation:**
- Windows Task Scheduler downloads Excel files daily with animals sent away in the last 7 days
- File format: `2026-04-11_GZ2_Isvezimas.xlsx`
- Rolling 7-day window means same animals can appear multiple times
- Need to check if departure date conflicts with withdrawal periods

**Solution:**
- Supabase table to store departure records
- RPC function for N8N to call (handles duplicates automatically)
- View to easily query conflicts
- React component to display in the interface

## Files Created

### 1. Database Migration
**File:** `supabase/migrations/20260412000000_create_animal_departures_system.sql`

Creates:
- `animal_departures` table - stores all departure records
- `upsert_animal_departure()` RPC function - handles N8N imports
- `vw_animal_departures_with_conflicts` view - easy querying
- RLS policies for security

### 2. N8N Integration Guide
**File:** `N8N_ANIMAL_DEPARTURES_INTEGRATION.md`

Complete guide for:
- Setting up HTTP Request node in N8N
- Field mapping from Excel to RPC function
- Handling responses and conflicts
- Alert/notification setup
- Troubleshooting

### 3. Test SQL Script
**File:** `test_animal_departures.sql`

Comprehensive tests for:
- Inserting departures
- Checking for duplicates
- Querying conflicts
- Verifying data integrity

### 4. React Component
**File:** `src/components/AnimalDepartures.tsx`

Features:
- Statistics dashboard (total, conflicts, not found, clean)
- Filters (conflicts, date range, search)
- Color-coded rows (red = conflict, yellow = not found, green = OK)
- Responsive table with all departure details

## Database Schema

### Table: `animal_departures`

```sql
CREATE TABLE public.animal_departures (
  id UUID PRIMARY KEY,
  animal_id UUID, -- FK to animals table (NULL if not found)
  animal_number TEXT NOT NULL, -- LT000008370444
  departure_date DATE NOT NULL,
  gender TEXT,
  birth_date TEXT,
  reason TEXT,
  vet_reason_code TEXT,
  destination_name TEXT,
  destination_herd_number TEXT,
  source_name TEXT,
  source_herd_number TEXT,
  entered_by TEXT,
  
  -- Calculated fields
  last_treatment_date DATE,
  last_withdrawal_milk DATE,
  last_withdrawal_meat DATE,
  has_withdrawal_conflict BOOLEAN,
  conflict_details TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(animal_number, departure_date) -- Prevents duplicates
);
```

### RPC Function: `upsert_animal_departure`

**Parameters:**
- `p_animal_number` TEXT (required)
- `p_departure_date` DATE (required)
- `p_gender` TEXT (optional)
- `p_birth_date` TEXT (optional)
- `p_reason` TEXT (optional)
- `p_vet_reason_code` TEXT (optional)
- `p_destination_name` TEXT (optional)
- `p_destination_herd_number` TEXT (optional)
- `p_source_name` TEXT (optional)
- `p_source_herd_number` TEXT (optional)
- `p_entered_by` TEXT (optional)

**Returns:**
```json
{
  "departure_id": "uuid",
  "animal_found": true/false,
  "has_conflict": true/false,
  "conflict_message": "description"
}
```

**Logic:**
1. Finds animal by `tag_no`
2. Gets latest `withdrawal_until_milk` and `withdrawal_until_meat` from treatments
3. Checks if `departure_date < withdrawal_until_*`
4. Calculates conflict days
5. Upserts record (INSERT or UPDATE if exists)

### View: `vw_animal_departures_with_conflicts`

Combines:
- All fields from `animal_departures`
- Calculated conflict days (`milk_conflict_days`, `meat_conflict_days`)
- Animal details from `animals` table (if found)

## How It Works

### Daily Automation Flow

```
Windows Task Scheduler
  ↓
Downloads Excel File (7-day rolling window)
  ↓
N8N Workflow
  ↓ (reads Excel)
N8N Split Out (one row per animal)
  ↓ (for each row)
HTTP Request to Supabase RPC
  ↓
upsert_animal_departure()
  ↓ (checks conflicts)
Response with conflict status
  ↓
IF has_conflict = true
  ↓
Send Alert (Email/Slack/Teams)
```

### Conflict Detection Logic

```javascript
// Milk withdrawal conflict
if (departure_date < last_withdrawal_milk) {
  conflict = true;
  days_over = last_withdrawal_milk - departure_date;
  message = `PIENO KARENCIJA: Išvežta ${departure_date}, 
             bet pieno karencija baigiasi ${last_withdrawal_milk} 
             (dar ${days_over} d.)`;
}

// Meat withdrawal conflict
if (departure_date < last_withdrawal_meat) {
  conflict = true;
  days_over = last_withdrawal_meat - departure_date;
  message = `MĖSOS KARENCIJA: Išvežta ${departure_date}, 
             bet mėsos karencija baigiasi ${last_withdrawal_meat} 
             (dar ${days_over} d.)`;
}
```

## N8N Configuration

### HTTP Request Node

**URL:**
```
https://your-project.supabase.co/rest/v1/rpc/upsert_animal_departure
```

**Method:** POST

**Headers:**
```json
{
  "Content-Type": "application/json",
  "apikey": "your-supabase-anon-key",
  "Authorization": "Bearer your-supabase-anon-key"
}
```

**Body (JSON):**
```json
{
  "p_animal_number": "{{ $json['Numeris'] }}",
  "p_departure_date": "{{ $json['Data'] }}",
  "p_gender": "{{ $json['Lytis'] }}",
  "p_birth_date": "{{ $json['Gimimo data'] }}",
  "p_reason": "{{ $json['Priežastis'] }}",
  "p_vet_reason_code": "{{ $json['Vet. priež. Nr.'] }}",
  "p_destination_name": "{{ $json['Vardas, pavardė / pavadinimas'] }}",
  "p_destination_herd_number": "{{ $json['Bandos numeris'] }}",
  "p_source_name": "{{ $json['Vardas, pavardė/pavadinimas'] }}",
  "p_source_herd_number": "{{ $json['Bandos numeris_1'] }}",
  "p_entered_by": "{{ $json['Įvedėjas'] }}"
}
```

## React Component Integration

### Add to your routing

```typescript
// In your App.tsx or routing file
import AnimalDepartures from './components/AnimalDepartures';

// Add route
<Route path="/animal-departures" element={<AnimalDepartures />} />
```

### Add to navigation menu

```typescript
// In your Layout.tsx or navigation component
<NavLink to="/animal-departures">
  Išvežti Gyvūnai
</NavLink>
```

## Example Queries

### Get all conflicts
```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE has_withdrawal_conflict = true
ORDER BY departure_date DESC;
```

### Get recent departures (last 7 days)
```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE departure_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY departure_date DESC;
```

### Get summary by date
```sql
SELECT 
  departure_date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE has_withdrawal_conflict) as conflicts
FROM animal_departures
GROUP BY departure_date
ORDER BY departure_date DESC;
```

### Find specific animal's departures
```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE animal_number = 'LT000008370444'
ORDER BY departure_date DESC;
```

## Testing

### 1. Apply Migration

```bash
cd supabase
npx supabase db push
```

### 2. Run Test Script

```sql
-- In Supabase SQL Editor
\i test_animal_departures.sql
```

### 3. Test N8N Integration

Use the cURL command from the integration guide to test the RPC function.

### 4. Test React Component

```bash
npm run dev
# Navigate to /animal-departures
```

## Maintenance

### Clean up old records (optional)

```sql
-- Delete departures older than 1 year
DELETE FROM animal_departures
WHERE departure_date < CURRENT_DATE - INTERVAL '1 year';
```

### Recalculate conflicts

If treatment data changes, you can re-run the upsert for existing records:

```sql
-- This will recalculate conflicts for all departures
SELECT upsert_animal_departure(
  animal_number,
  departure_date,
  gender,
  birth_date,
  reason,
  vet_reason_code,
  destination_name,
  destination_herd_number,
  source_name,
  source_herd_number,
  entered_by
)
FROM animal_departures;
```

## Security

### RLS Policies

- **SELECT:** Authenticated users can read all departures
- **INSERT:** Anon role can insert (for N8N)
- **UPDATE:** Anon role can update (for N8N)

This allows N8N to use the anon key without authentication while keeping data secure for regular users.

## Troubleshooting

### Issue: Animals not found in database

**Cause:** Animal not synced from VIC yet, or tag number format mismatch

**Solution:**
```sql
-- Check if animal exists with similar number
SELECT tag_no FROM animals 
WHERE tag_no LIKE '%8370444%';
```

### Issue: Dates not parsing correctly

**Cause:** Excel date format issues in N8N

**Solution:** Use N8N's Date & Time node to convert to ISO format (YYYY-MM-DD)

### Issue: Duplicate records created

**Cause:** Unique constraint not working

**Check:**
```sql
-- Verify unique constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'animal_departures'::regclass;
```

## Next Steps

1. ✅ Apply migration to Supabase
2. ✅ Test RPC function with sample data
3. ✅ Configure N8N HTTP Request node
4. ✅ Set up conflict alerts (email/Slack)
5. ✅ Add React component to your app
6. ✅ Schedule daily automation
7. ✅ Monitor for first week

## Support

For questions or issues:
1. Check the N8N integration guide
2. Run the test SQL script
3. Check Supabase logs for errors
4. Verify RLS policies are correct

## Future Enhancements

Possible improvements:
- Email notifications directly from Supabase (using triggers)
- Dashboard widget showing recent conflicts
- Export conflicts to PDF report
- Integration with VIC API to auto-update animal data
- Batch recalculation of conflicts when treatments are updated
