# N8N Integration Guide - Animal Departures (Išvežti Gyvūnai)

## Overview

This system tracks animals that have been sent away and automatically checks if their departure date conflicts with their last recorded withdrawal periods (karencines dienos).

## Database Structure

### Table: `animal_departures`

Stores all departed animals with their withdrawal conflict information.

### RPC Function: `upsert_animal_departure`

Handles upserts from N8N without creating duplicates. Uses `(animal_number, departure_date)` as unique constraint.

## N8N Workflow Setup

### 1. Excel File Processing

Your current workflow downloads the Excel file daily from:
```
c:\automations\downloads\2026-04-11_GZ2_Isvezimas.xlsx
```

The file contains animals from the last 7 days (rolling window).

### 2. HTTP Request Node Configuration

**Method:** POST  
**URL:** `https://your-supabase-project.supabase.co/rest/v1/rpc/upsert_animal_departure`

**Authentication:**
- Type: Header Auth
- Header Name: `apikey`
- Header Value: Your Supabase anon key

**Headers:**
```json
{
  "Content-Type": "application/json",
  "apikey": "your-supabase-anon-key",
  "Authorization": "Bearer your-supabase-anon-key"
}
```

### 3. Request Body Mapping

For each row from your Excel, map the fields as follows:

```javascript
{
  "p_animal_number": "{{ $json['Numeris'] }}", // LT000008370444
  "p_departure_date": "{{ $json['Data'] }}", // 2026-04-07
  "p_gender": "{{ $json['Lytis'] }}", // Karvė
  "p_birth_date": "{{ $json['Gimimo data'] }}", // 2021-03-16
  "p_reason": "{{ $json['Priežastis'] }}", // (usually empty)
  "p_vet_reason_code": "{{ $json['Vet. priež. Nr.'] }}", // 17
  "p_destination_name": "{{ $json['Vardas, pavardė / pavadinimas'] }}", // Destination
  "p_destination_herd_number": "{{ $json['Bandos numeris'] }}", // Destination herd
  "p_source_name": "{{ $json['Vardas, pavardė/pavadinimas'] }}", // Source (usually same)
  "p_source_herd_number": "{{ $json['Bandos numeris_1'] }}", // Source herd
  "p_entered_by": "{{ $json['Įvedėjas'] }}" // INDRĖ ILONYTĖ
}
```

### 4. Example N8N Flow

```
[Excel File] 
    → [Read Binary File]
    → [Spreadsheet File (Read)]
    → [Split Out] (one item per row)
    → [HTTP Request] (call upsert_animal_departure for each row)
    → [IF Node] (check for conflicts)
        → TRUE: [Send Alert/Email]
        → FALSE: [Continue]
```

## Response Format

The RPC function returns:

```json
{
  "departure_id": "uuid-here",
  "animal_found": true,
  "has_conflict": false,
  "conflict_message": "Nėra karencijos konfliktų"
}
```

### Conflict Example Response

```json
{
  "departure_id": "uuid-here",
  "animal_found": true,
  "has_conflict": true,
  "conflict_message": "PIENO KARENCIJA: Išvežta 2026-04-07, bet pieno karencija baigiasi 2026-04-16 (dar 9 d.). MĖSOS KARENCIJA: Išvežta 2026-04-07, bet mėsos karencija baigiasi 2026-04-11 (dar 4 d.)."
}
```

### Animal Not Found Response

```json
{
  "departure_id": "uuid-here",
  "animal_found": false,
  "has_conflict": false,
  "conflict_message": "Gyvūnas nerastas duomenų bazėje (galbūt dar nesinchronizuotas iš VIC)"
}
```

## Handling Duplicates

The system automatically handles duplicates using the unique constraint on `(animal_number, departure_date)`.

- **First import:** Creates new record
- **Subsequent imports:** Updates existing record with latest data
- **Rolling 7-day window:** Old records remain in database, new ones are added/updated

This means:
- ✅ Running the import multiple times per day is safe
- ✅ The 7-day rolling window won't create duplicates
- ✅ Historical data is preserved

## Querying Departed Animals

### Get All Departures with Conflicts

```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE has_withdrawal_conflict = true
ORDER BY departure_date DESC;
```

### Get Recent Departures (Last 7 Days)

```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE departure_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY departure_date DESC;
```

### Get Departures by Animal Number

```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE animal_number = 'LT000008370444';
```

### Get Conflict Summary

```sql
SELECT 
  departure_date,
  COUNT(*) as total_departures,
  COUNT(*) FILTER (WHERE has_withdrawal_conflict) as conflicts,
  COUNT(*) FILTER (WHERE NOT animal_found) as not_found_in_db
FROM vw_animal_departures_with_conflicts
WHERE departure_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY departure_date
ORDER BY departure_date DESC;
```

## Alert/Notification Logic in N8N

### Option 1: Email Alert on Conflicts

Add an IF node after the HTTP Request:

```javascript
// Condition
{{ $json.has_conflict === true }}
```

If TRUE, send email with conflict details.

### Option 2: Slack/Teams Notification

Post to Slack/Teams channel when conflicts are detected:

```javascript
{
  "text": "⚠️ Karencijos konfliktas!",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Gyvūnas:* {{ $json.p_animal_number }}\n*Išvežimo data:* {{ $json.p_departure_date }}\n*Konfliktas:* {{ $json.conflict_message }}"
      }
    }
  ]
}
```

### Option 3: Write to Separate Conflict Log File

Create a CSV/Excel file with only conflicts for manual review.

## Testing the Integration

### Test with cURL

```bash
curl -X POST 'https://your-project.supabase.co/rest/v1/rpc/upsert_animal_departure' \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "p_animal_number": "LT000008370444",
    "p_departure_date": "2026-04-07",
    "p_gender": "Karvė",
    "p_birth_date": "2021-03-16",
    "p_vet_reason_code": "17",
    "p_destination_name": "PANEVĖŽIO RAJONO ŽŪB BERČIŪNAI",
    "p_destination_herd_number": "11198300328",
    "p_source_name": "PANEVĖŽIO RAJONO ŽŪB BERČIŪNAI",
    "p_source_herd_number": "11198300328",
    "p_entered_by": "INDRĖ ILONYTĖ"
  }'
```

### Test in Supabase SQL Editor

```sql
-- Test the function
SELECT * FROM upsert_animal_departure(
  p_animal_number := 'LT000008370444',
  p_departure_date := '2026-04-07',
  p_gender := 'Karvė',
  p_birth_date := '2021-03-16',
  p_vet_reason_code := '17',
  p_destination_name := 'PANEVĖŽIO RAJONO ŽŪB BERČIŪNAI',
  p_destination_herd_number := '11198300328',
  p_source_name := 'PANEVĖŽIO RAJONO ŽŪB BERČIŪNAI',
  p_source_herd_number := '11198300328',
  p_entered_by := 'INDRĖ ILONYTĖ'
);

-- Check the result
SELECT * FROM vw_animal_departures_with_conflicts
WHERE animal_number = 'LT000008370444';
```

## Troubleshooting

### Issue: "permission denied for function upsert_animal_departure"

**Solution:** The migration includes GRANT statements for both `authenticated` and `anon` roles. Make sure the migration ran successfully.

### Issue: Animals not found in database

**Reason:** The animal might not be synced from VIC yet, or the tag number format doesn't match.

**Check:**
```sql
SELECT tag_no FROM animals WHERE tag_no LIKE '%8370444%';
```

### Issue: Dates not parsing correctly

**Reason:** Excel date format might need conversion in N8N.

**Solution:** Use N8N's Date & Time node to convert Excel dates to ISO format (YYYY-MM-DD).

## Maintenance

### Clean Up Old Records (Optional)

If you want to remove departures older than 1 year:

```sql
DELETE FROM animal_departures
WHERE departure_date < CURRENT_DATE - INTERVAL '1 year';
```

### Recalculate Conflicts for Existing Records

If treatment data changes and you need to recalculate conflicts:

```sql
-- This will re-run the conflict check for all existing departures
-- (You'd need to create a batch update function for this)
```

## Next Steps

1. ✅ Apply the migration: `20260412000000_create_animal_departures_system.sql`
2. ✅ Test the RPC function with sample data
3. ✅ Configure N8N HTTP Request node
4. ✅ Set up conflict alerts (email/Slack/Teams)
5. ✅ Schedule the daily automation
6. ✅ Monitor for the first week to ensure no issues

## Questions?

- **Q: What if the same animal is sent away multiple times?**  
  A: Each unique `(animal_number, departure_date)` combination is stored separately. Multiple departures on different dates are tracked independently.

- **Q: What if I run the import twice in one day?**  
  A: The second run will UPDATE the existing records (based on unique constraint), not create duplicates.

- **Q: How do I see only conflicts?**  
  A: Use: `SELECT * FROM vw_animal_departures_with_conflicts WHERE has_withdrawal_conflict = true;`

- **Q: Can I manually add a departure?**  
  A: Yes, call the RPC function directly from Supabase or your frontend.
