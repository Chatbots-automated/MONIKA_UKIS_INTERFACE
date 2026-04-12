# Quick Start - Animal Departures System

## 🚀 Setup (5 minutes)

### Step 1: Apply Migration
```bash
cd supabase
npx supabase db push
```

### Step 2: Test the RPC Function
```sql
-- In Supabase SQL Editor, run:
SELECT * FROM upsert_animal_departure(
  p_animal_number := 'LT000008370444',
  p_departure_date := '2026-04-07',
  p_gender := 'Karvė',
  p_entered_by := 'TEST'
);
```

### Step 3: Configure N8N

**HTTP Request Node:**
- URL: `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/upsert_animal_departure`
- Method: POST
- Headers:
  ```json
  {
    "apikey": "YOUR_ANON_KEY",
    "Authorization": "Bearer YOUR_ANON_KEY",
    "Content-Type": "application/json"
  }
  ```
- Body:
  ```json
  {
    "p_animal_number": "{{ $json['Numeris'] }}",
    "p_departure_date": "{{ $json['Data'] }}",
    "p_gender": "{{ $json['Lytis'] }}",
    "p_birth_date": "{{ $json['Gimimo data'] }}",
    "p_vet_reason_code": "{{ $json['Vet. priež. Nr.'] }}",
    "p_destination_name": "{{ $json['Vardas, pavardė / pavadinimas'] }}",
    "p_destination_herd_number": "{{ $json['Bandos numeris'] }}",
    "p_source_name": "{{ $json['Vardas, pavardė/pavadinimas'] }}",
    "p_source_herd_number": "{{ $json['Bandos numeris_1'] }}",
    "p_entered_by": "{{ $json['Įvedėjas'] }}"
  }
  ```

### Step 4: Add to Your App (Optional)

Add route in `App.tsx`:
```typescript
import AnimalDepartures from './components/AnimalDepartures';

<Route path="/animal-departures" element={<AnimalDepartures />} />
```

## 📊 Quick Queries

### View all conflicts
```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE has_withdrawal_conflict = true;
```

### Last 7 days
```sql
SELECT * FROM vw_animal_departures_with_conflicts
WHERE departure_date >= CURRENT_DATE - INTERVAL '7 days';
```

### Summary stats
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE has_withdrawal_conflict) as conflicts,
  COUNT(*) FILTER (WHERE animal_id IS NULL) as not_found
FROM animal_departures;
```

## 🔍 Understanding the Response

### Success (No Conflict)
```json
{
  "departure_id": "uuid",
  "animal_found": true,
  "has_conflict": false,
  "conflict_message": "Nėra karencijos konfliktų"
}
```

### Conflict Detected
```json
{
  "departure_id": "uuid",
  "animal_found": true,
  "has_conflict": true,
  "conflict_message": "PIENO KARENCIJA: Išvežta 2026-04-07, bet pieno karencija baigiasi 2026-04-16 (dar 9 d.)."
}
```

### Animal Not Found
```json
{
  "departure_id": "uuid",
  "animal_found": false,
  "has_conflict": false,
  "conflict_message": "Gyvūnas nerastas duomenų bazėje"
}
```

## 🎯 N8N Alert Setup

Add IF node after HTTP Request:
```javascript
// Condition
{{ $json.has_conflict === true }}
```

If TRUE → Send email/Slack notification with:
- Animal number: `{{ $json.p_animal_number }}`
- Departure date: `{{ $json.p_departure_date }}`
- Conflict: `{{ $json.conflict_message }}`

## ✅ Checklist

- [ ] Migration applied successfully
- [ ] Test RPC function works
- [ ] N8N HTTP Request node configured
- [ ] Field mapping verified
- [ ] Alert system set up
- [ ] Daily automation scheduled
- [ ] React component added (optional)

## 🆘 Troubleshooting

**Problem:** "permission denied for function"  
**Fix:** Migration includes GRANT statements, re-run migration

**Problem:** Animals not found  
**Check:** `SELECT tag_no FROM animals WHERE tag_no LIKE '%8370444%';`

**Problem:** Dates not parsing  
**Fix:** Use N8N Date & Time node to convert to YYYY-MM-DD

## 📁 Files Created

1. `supabase/migrations/20260412000000_create_animal_departures_system.sql` - Database
2. `N8N_ANIMAL_DEPARTURES_INTEGRATION.md` - Full N8N guide
3. `test_animal_departures.sql` - Test queries
4. `src/components/AnimalDepartures.tsx` - React UI
5. `ANIMAL_DEPARTURES_SYSTEM.md` - Complete documentation
6. `QUICK_START_ANIMAL_DEPARTURES.md` - This file

## 🎉 You're Done!

The system will now:
- ✅ Track all departed animals
- ✅ Check withdrawal period conflicts automatically
- ✅ Handle duplicates (7-day rolling window)
- ✅ Alert you when conflicts are detected
- ✅ Store historical data for reporting
