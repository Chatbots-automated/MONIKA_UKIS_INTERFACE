# n8n Milk Data Import Setup

This guide explains how to set up n8n to automatically import scraped milk testing data into Supabase.

## RPC Function Endpoint

The import function is available as a Supabase RPC function called `import_milk_data`. You can call it via the REST API:

```
https://[your-supabase-project-ref].supabase.co/rest/v1/rpc/import_milk_data
```

## How to Use with n8n

### Step 1: Get Your Service Role Key

You'll need your **Supabase Service Role Key** from your Supabase project settings. This key allows the import function to run without user authentication.

### Step 2: Configure n8n Workflow

#### Node 1: Read/Fetch Scraped JSON Data
- Use HTTP Request node or Read Binary File node
- Get your scraped milk data JSON

#### Node 2: HTTP Request to Supabase RPC Function
Configure the HTTP Request node:

**Method:** `POST`

**URL:** `https://[your-project-ref].supabase.co/rest/v1/rpc/import_milk_data`

**Authentication:** None (we'll add headers manually)

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
  "apikey": "YOUR_SERVICE_ROLE_KEY",
  "Content-Type": "application/json",
  "Prefer": "params=single-object"
}
```

**Body:**
- Content Type: JSON
- Body format:
```json
{
  "p_scraped_data": {{ JSON.stringify($json.data) }}
}
```

**Expected JSON Format:**
```json
{
  "scraped_at": "2025-12-23T12:55:37.698Z",
  "url": "https://tau.pieno-tyrimai.lt/...",
  "range": {
    "from": "20251218",
    "to": "20251223"
  },
  "results": {
    "881989": {
      "gamintojo_id": "881989",
      "label": "naktinis",
      "meta": {
        "imone": "AB \"Pieno žvaigždės\" fil. Panevėžio pienas",
        "rajonas": "Panevėžio r.",
        "punktas": "10325.Punktas",
        "gamintojas": "41982-1",
        "periodas": {
          "nuo": "2025.12.18",
          "iki": "2025.12.23"
        }
      },
      "tables": {
        "pieno_sudeties_tyrimai": { ... },
        "pieno_kokybes_tyrimai": { ... }
      }
    }
  }
}
```

### Step 3: Handle Response

**Success Response (200):**
```json
{
  "success": true,
  "imported": {
    "producers": 2,
    "compositionTests": 4,
    "qualityTests": 4
  },
  "errors": []  // Optional: array of any non-fatal errors
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## n8n Workflow Example

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Trigger/Cron   │────▶│  HTTP Request   │────▶│  Success Check  │
│  (Daily/Weekly) │     │  (Get JSON)     │     │  & Notify       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  HTTP Request   │
                        │  (Supabase RPC  │
                        │   Function)     │
                        └─────────────────┘
```

## Testing the Function

### With curl:

```bash
curl -X POST \
  https://[your-project-ref].supabase.co/rest/v1/rpc/import_milk_data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: params=single-object" \
  -d '{
    "p_scraped_data": '"$(cat scraped_data.json)"'
  }'
```

## Troubleshooting

### Error: "Missing Authorization header"
- Make sure you're passing the `Authorization` header with your service role key

### Error: "Invalid data format"
- Check that your JSON matches the expected structure
- Ensure `results` object exists and contains producer data
- Verify the payload is wrapped in `p_scraped_data` parameter

### Error: "Failed to create scrape session"
- Check that date fields are in correct format (YYYYMMDD or YY.MM.DD)
- Verify `scraped_at` is a valid timestamp

### Error: "Failed to upsert producer"
- Check database connection
- Verify the `gamintojo_id` field is present in your data

## Data Flow

1. n8n scrapes milk testing website → generates JSON
2. n8n sends JSON to Supabase RPC function via REST API
3. RPC function creates a scrape session record
4. RPC function processes each producer:
   - Creates/updates producer record
   - Imports composition test results
   - Imports quality test results
5. Returns success/failure response to n8n with import counts

## Notes

- Duplicate records are handled automatically (upserted based on unique constraints)
- Dates in format "25.12.18" are automatically converted to "2025-12-18"
- Import history is tracked in `milk_scrape_sessions` table
- Function uses `SECURITY DEFINER` so it runs with elevated privileges
- No user authentication required when using service role key
