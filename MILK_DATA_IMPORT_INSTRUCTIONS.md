# Milk Test Data Import System

## Overview

This system allows you to import scraped milk test data from Playwright into Supabase and display it in your application.

## Database Schema

The system uses 5 tables:

### 1. `milk_scrape_sessions`
Tracks each scraping session:
- `id` - Session UUID
- `scraped_at` - Timestamp when data was scraped
- `url` - Source URL
- `date_from` - Test period start date
- `date_to` - Test period end date

### 2. `milk_producers`
Stores producer/farm information:
- `id` - Producer UUID
- `gamintojo_id` - External ID (e.g., "881989")
- `gamintojas_code` - Producer code (e.g., "41982-1")
- `label` - Label like "naktinis" (night) or "rytinis" (morning)
- `imone` - Company name
- `rajonas` - Region
- `punktas` - Collection point

### 3. `milk_composition_tests`
Individual composition test results:
- `id` - Test UUID
- `producer_id` - FK to milk_producers
- `scrape_session_id` - FK to milk_scrape_sessions
- `paemimo_data` - Collection date
- `atvezimo_data` - Delivery date
- `tyrimo_data` - Test date
- `riebalu_kiekis` - Fat content %
- `baltymu_kiekis` - Protein content %
- `laktozes_kiekis` - Lactose content %
- `persk_koef` - Conversion coefficient
- `ureja_mg_100ml` - Urea mg/100ml
- `ph` - pH level
- `pastaba` - Notes
- `konteineris` - Container ID
- `plomba` - Seal number
- `prot_nr` - Protocol number

### 4. `milk_quality_tests`
Individual quality test results:
- `id` - Test UUID
- `producer_id` - FK to milk_producers
- `scrape_session_id` - FK to milk_scrape_sessions
- `paemimo_data` - Collection date
- `atvezimo_data` - Delivery date
- `tyrimo_data` - Test date
- `somatiniu_lasteliu_skaicius` - Somatic cell count (thousand/ml)
- `bendras_bakteriju_skaicius` - Total bacteria count (thousand/ml)
- `neatit_pst` - Non-compliance PST
- `konteineris` - Container ID
- `plomba` - Seal number
- `prot_nr` - Protocol number

### 5. `milk_test_summaries`
Stores averages and summaries:
- `id` - Summary UUID
- `producer_id` - FK to milk_producers (nullable)
- `scrape_session_id` - FK to milk_scrape_sessions
- `summary_type` - Either 'gamintojo' (producer) or 'punktas' (point)
- `label` - Display label (e.g., "41982.Gamintojo vid.")
- `test_type` - Either 'composition' or 'quality'
- `data` - JSONB with all summary values

## How to Import Data

### Step 1: Get Your Scraped Data
Your Playwright scraper outputs JSON in this format:

```json
{
  "scraped_at": "2025-12-23T12:55:37.698Z",
  "url": "https://tau.pieno-tyrimai.lt/...",
  "range": {
    "from": "20251218",
    "to": "20251223"
  },
  "results": {
    "881989": { ... },
    "881990": { ... }
  }
}
```

### Step 2: Import the Data

Use the helper function in `src/lib/milkDataImporter.ts`:

```typescript
import { importMilkTestData } from './lib/milkDataImporter';

// Your scraped data
const scrapedData = { /* ... your JSON data ... */ };

// Import it
try {
  const result = await importMilkTestData(scrapedData);
  console.log('Import successful! Session ID:', result.sessionId);
} catch (error) {
  console.error('Import failed:', error);
}
```

### Step 3: Query the Data

Use the helper functions to retrieve data:

```typescript
import { getMilkTestData, getProducers } from './lib/milkDataImporter';

// Get all producers
const { data: producers } = await getProducers();

// Get all test data
const { composition, quality } = await getMilkTestData();

// Get data for specific producer
const producerId = 'some-uuid';
const testData = await getMilkTestData(producerId);

// Get data for date range
const testData = await getMilkTestData(
  undefined,
  '2025-12-18',
  '2025-12-23'
);

// Get data for specific producer and date range
const testData = await getMilkTestData(
  producerId,
  '2025-12-18',
  '2025-12-23'
);
```

## Date Format Handling

The system automatically converts dates from the scraped format:
- Input: `"25.12.18"` (YY.MM.DD)
- Output: `"2025-12-18"` (YYYY-MM-DD)

## Data Flow

1. **Scrape** → Playwright collects data from website
2. **Parse** → Date conversion and data structuring
3. **Session** → Create scrape session record
4. **Producer** → Insert/update producer info (upsert)
5. **Tests** → Insert composition and quality test rows (upsert)
6. **Summaries** → Insert summary/average data
7. **Display** → Query and show in your UI

## Duplicate Handling

The system uses UPSERT to handle duplicates:

- **Producers**: Unique on `gamintojo_id`
- **Composition Tests**: Unique on `(producer_id, paemimo_data, konteineris)`
- **Quality Tests**: Unique on `(producer_id, paemimo_data, konteineris)`

If you import the same data twice, existing records will be updated rather than creating duplicates.

## Security

All tables have RLS enabled:
- Authenticated users can read all data
- Authenticated users can insert/update their own data
- Policies ensure data isolation per organization (if needed)

## Example UI Component

Here's how you might display the data:

```typescript
import { useEffect, useState } from 'react';
import { getMilkTestData, getProducers } from '../lib/milkDataImporter';

export function MilkTestResults() {
  const [producers, setProducers] = useState([]);
  const [testData, setTestData] = useState({ composition: [], quality: [] });
  const [selectedProducer, setSelectedProducer] = useState('');

  useEffect(() => {
    getProducers().then(({ data }) => setProducers(data || []));
  }, []);

  useEffect(() => {
    getMilkTestData(selectedProducer || undefined).then(setTestData);
  }, [selectedProducer]);

  return (
    <div>
      <select
        value={selectedProducer}
        onChange={(e) => setSelectedProducer(e.target.value)}
      >
        <option value="">All Producers</option>
        {producers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} - {p.gamintojas_code}
          </option>
        ))}
      </select>

      <h2>Composition Tests</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Fat %</th>
            <th>Protein %</th>
            <th>Lactose %</th>
            <th>pH</th>
            <th>Container</th>
          </tr>
        </thead>
        <tbody>
          {testData.composition.map((test) => (
            <tr key={test.id}>
              <td>{test.paemimo_data}</td>
              <td>{test.riebalu_kiekis}</td>
              <td>{test.baltymu_kiekis}</td>
              <td>{test.laktozes_kiekis}</td>
              <td>{test.ph}</td>
              <td>{test.konteineris}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Quality Tests</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Somatic Cells</th>
            <th>Bacteria Count</th>
            <th>Container</th>
          </tr>
        </thead>
        <tbody>
          {testData.quality.map((test) => (
            <tr key={test.id}>
              <td>{test.paemimo_data}</td>
              <td>{test.somatiniu_lasteliu_skaicius}</td>
              <td>{test.bendras_bakteriju_skaicius}</td>
              <td>{test.konteineris}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Automation Options

### Option 1: Manual Import
Upload JSON file through UI and call `importMilkTestData()`

### Option 2: Scheduled Import
Run Playwright scraper on a schedule (cron job) and automatically import results

### Option 3: API Endpoint
Create an edge function that accepts scraped data via POST request

### Option 4: File Watcher
Watch a directory for new JSON files and auto-import them

## Tips

1. **Always validate** scraped data before importing
2. **Log scrape sessions** so you know when data was last updated
3. **Handle errors gracefully** - partial imports should not break the system
4. **Add indexes** if querying large datasets (already included in migration)
5. **Consider archiving** old test data after a certain period
6. **Add analytics** to track trends over time (avg fat %, somatic cells, etc.)

## Next Steps

1. Run the migration (it's in `supabase/migrations/20251223000000_create_milk_test_system.sql`)
2. Test the import with your scraped JSON data
3. Create a UI component to display the data
4. Add filtering, sorting, and export functionality
5. Consider adding charts/graphs for trend analysis
