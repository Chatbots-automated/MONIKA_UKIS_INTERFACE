# n8n Milk Data Import Setup

This guide explains how to set up n8n to automatically import scraped milk testing data into Supabase.

## Edge Function Endpoint

The edge function is deployed at:
```
https://[your-supabase-project-ref].supabase.co/functions/v1/import-milk-data
```

## How to Use with n8n

### Step 1: Get Your Authentication Token

You'll need a valid Supabase user authentication token. This can be:
- A session token from a logged-in user
- OR use your Supabase Service Role Key (for automated imports)

**For Service Role Key (recommended for automation):**
- Use your `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings
- Note: This bypasses RLS, so the function will need to be modified slightly to accept a user_id parameter

**For User Token:**
- Generate a user session token by logging in through your app
- The token is available in the Authorization header

### Step 2: Configure n8n Workflow

#### Node 1: Read/Fetch Scraped JSON Data
- Use HTTP Request node or Read Binary File node
- Get your scraped milk data JSON

#### Node 2: HTTP Request to Supabase Edge Function
Configure the HTTP Request node:

**Method:** `POST`

**URL:** `https://[your-project-ref].supabase.co/functions/v1/import-milk-data`

**Authentication:** None (we'll add headers manually)

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_USER_TOKEN_HERE",
  "Content-Type": "application/json"
}
```

**Body:**
- Content Type: JSON
- Body: `{{ $json }}`  (or your scraped data variable)

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
                        │  (Supabase      │
                        │   Edge Func)    │
                        └─────────────────┘
```

## Alternative: Using Service Role Key

If you want to import data as a specific user using the Service Role Key, modify the n8n workflow to include a `user_id` in the request body, and update the edge function to accept and use this parameter.

**Modified Request Body:**
```json
{
  "user_id": "uuid-of-the-user",
  "data": {
    "scraped_at": "...",
    "url": "...",
    "range": { ... },
    "results": { ... }
  }
}
```

Then update the edge function to extract `user_id` from the request body instead of getting it from the auth token.

## Testing the Function

You can test the edge function with curl:

```bash
curl -X POST \
  https://[your-project-ref].supabase.co/functions/v1/import-milk-data \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @scraped_data.json
```

## Troubleshooting

### Error: "Missing Authorization header"
- Make sure you're passing the `Authorization` header with a valid token

### Error: "Invalid authentication token"
- Your token may have expired
- Verify the token is correct

### Error: "Invalid data format"
- Check that your JSON matches the expected structure
- Ensure `results` object exists and contains producer data

### Error: "Failed to upsert producer"
- Check database connection
- Verify RLS policies are correctly configured
- Check that the user_id in the token matches your auth.users table

## Data Flow

1. n8n scrapes milk testing website → generates JSON
2. n8n sends JSON to Supabase Edge Function
3. Edge Function validates authentication
4. Edge Function processes each producer:
   - Creates/updates producer record
   - Imports composition test results
   - Imports quality test results
5. Edge Function logs the import operation
6. Returns success/failure response to n8n

## Notes

- Duplicate records are handled automatically (upserted based on unique constraints)
- Dates in format "25.12.18" are automatically converted to "2025-12-18"
- All data is tied to the authenticated user
- Import history is tracked in `milk_scrape_logs` table
