# n8n Milk Data Import Setup

This guide explains how to set up n8n to automatically import scraped milk testing data into Supabase.

## RPC Function Endpoint

The import function is available as a Supabase RPC function called `import_milk_data`. You can call it via the REST API:

```
https://[your-supabase-project-ref].supabase.co/rest/v1/rpc/import_milk_data
```

## How to Use with n8n

### Step 1: Get Your Authentication Credentials

You'll need either:
- **Supabase Anon Key** (from your Supabase project settings) + User JWT token
- **OR Service Role Key** (for automated imports)

**For User Authentication (recommended):**
- Use the `SUPABASE_ANON_KEY` from your Supabase project settings
- Include the user's JWT token in the Authorization header
- The function will automatically associate data with the authenticated user

**For Service Role Key:**
- Use your `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings
- Include a user's JWT token to identify which user to import data for
- This bypasses RLS but still uses the authenticated user's ID

### Step 2: Get Your User ID (for Service Role Key only)

If using the service role key, you need the UUID of the user who should own the imported data.

To find your user ID:
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click on the user (e.g., admin@vetstock.lt)
4. Copy the **UUID** from the user details

Or query it directly:
```sql
SELECT id FROM users WHERE email = 'admin@vetstock.lt';
```

### Step 3: Configure n8n Workflow

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
  "Authorization": "Bearer YOUR_USER_JWT_TOKEN_HERE",
  "apikey": "YOUR_SUPABASE_ANON_KEY_HERE",
  "Content-Type": "application/json"
}
```

**Body:**
- Content Type: JSON
- Body format (with service role key):
```json
{
  "p_scraped_data": {{ $json }},
  "p_user_id": "your-user-uuid-here"
}
```
- Body format (with user JWT):
```json
{
  "p_scraped_data": {{ $json }}
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

### With Service Role Key (for automation):

```bash
curl -X POST \
  https://[your-project-ref].supabase.co/rest/v1/rpc/import_milk_data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: params=single-object" \
  -d '{
    "p_scraped_data": '"$(cat scraped_data.json)"',
    "p_user_id": "your-user-uuid-here"
  }'
```

### With User JWT (from frontend):

```bash
curl -X POST \
  https://[your-project-ref].supabase.co/rest/v1/rpc/import_milk_data \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: params=single-object" \
  -d '{
    "p_scraped_data": '"$(cat scraped_data.json)"'
  }'
```

### From your frontend application:

```typescript
import { supabase } from './lib/supabase';

const scrapedData = {
  scraped_at: "2025-12-23T12:55:37.698Z",
  url: "https://tau.pieno-tyrimai.lt/...",
  range: { from: "20251218", to: "20251223" },
  results: { /* producer data */ }
};

const { data, error } = await supabase.rpc('import_milk_data', {
  p_scraped_data: scrapedData
});

if (error) {
  console.error('Import failed:', error);
} else {
  console.log('Import successful:', data);
}
```

## Troubleshooting

### Error: "Authentication required"
- If using **service role key**: You must provide the `p_user_id` parameter
- If using **user JWT**: Make sure the user is authenticated and the token is valid

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
- Verify the user_id exists in the users table

## Data Flow

1. n8n scrapes milk testing website → generates JSON
2. n8n sends JSON to Supabase RPC function via REST API
3. RPC function validates authentication using `auth.uid()`
4. RPC function processes each producer:
   - Creates/updates producer record
   - Imports composition test results
   - Imports quality test results
5. RPC function logs the import operation
6. Returns success/failure response to n8n

## Notes

- Duplicate records are handled automatically (upserted based on unique constraints)
- Dates in format "25.12.18" are automatically converted to "2025-12-18"
- All data is tied to the authenticated user
- Import history is tracked in `milk_scrape_logs` table
