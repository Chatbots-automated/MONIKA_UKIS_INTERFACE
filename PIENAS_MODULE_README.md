# Pienas (Milk) Module - Setup Guide

## Overview

The Pienas module is a comprehensive milk production and quality tracking system with real-time data synchronization. It's designed to connect with milk scales for automatic data collection and provides detailed milk quality analysis through lab test results.

## Features

### 1. Real-time Milk Production Tracking
- Automatic data collection from connected milk scales
- Records individual milking sessions with:
  - Date and time of milking
  - Milk quantity (kg)
  - Milk temperature
  - Session type (morning, afternoon, evening)
  - Milking duration
  - Flow rate
  - Conductivity (mastitis indicator)
  - Scale device ID

### 2. Milk Quality Testing (Pieno Tyrimai)
- Lab test results tracking including:
  - Fat percentage
  - Protein percentage
  - Lactose percentage
  - Somatic Cell Count (SCC) - mastitis indicator
  - Bacteria count
  - Urea level
  - pH level
  - Freezing point
  - Total solids
- Test status management (pending, completed, requires attention)
- Lab reference tracking

### 3. Analytics Dashboard
- Overview statistics
- Production summaries (daily, weekly)
- Latest test results per animal
- SCC status indicators (Excellent, Good, Average, Poor)
- Combined production and quality metrics

### 4. Realtime Updates
- Automatic UI updates when scale sends new data
- Live production monitoring
- No page refresh needed

## Database Setup

### Apply the Migration

Run the SQL migration to create the necessary tables:

```bash
node apply_milk_module_migration.js
```

Or manually run the SQL in Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor
2. Open SQL Editor
3. Copy contents from `create_milk_module_migration.sql`
4. Paste and execute

### What Gets Created

**Tables:**
- `milk_production` - Real-time production data from scales
- `milk_tests` - Lab test results

**Views:**
- `vw_milk_analytics` - Combined analytics view

**Features:**
- Row Level Security (RLS) enabled
- Realtime subscriptions enabled
- Automatic timestamp updates
- Performance indexes

## Using the Module

### Access the Module

1. Log into the system
2. Click on "Pienas" in the navigation menu
3. You'll see 4 tabs:
   - **Apžvalga** (Overview) - Dashboard with key metrics
   - **Pieno gamyba** (Production) - All production records
   - **Pieno tyrimai** (Tests) - Lab test results
   - **Analitika** (Analytics) - Per-animal analysis

### Manual Entry

If you need to add data manually (before connecting the scale):

1. Click "Pridėti įrašą" (Add Record) in Production tab
2. Fill in the details
3. Submit

Similar for test results using "Pridėti tyrimą" (Add Test)

### Connecting Your Milk Scale

To connect your milk scale to automatically send data:

1. Configure your scale to send HTTP POST requests to:
   ```
   https://olxnahsxvyiadknybagt.supabase.co/rest/v1/milk_production
   ```

2. Include these headers:
   ```
   apikey: [Your Supabase Anon Key from .env]
   Authorization: Bearer [Your Supabase Anon Key from .env]
   Content-Type: application/json
   ```

3. Send data in this format:
   ```json
   {
     "animal_id": "uuid-of-animal",
     "measurement_date": "2025-12-20",
     "measurement_time": "06:30:00",
     "milk_quantity": 28.5,
     "milk_temperature": 35.2,
     "session_type": "morning",
     "milking_duration": 420,
     "flow_rate": 4.07,
     "conductivity": 5.2,
     "scale_device_id": "SCALE_001"
   }
   ```

4. The data will appear instantly in the UI (realtime enabled!)

### Importing Lab Test Results

Lab test results can be:
1. Entered manually through the UI
2. Imported via CSV/Excel (to be implemented)
3. Sent directly from lab systems via API

## SCC (Somatic Cell Count) Interpretation

The system automatically categorizes SCC levels:
- **< 200,000** cells/ml: Excellent (Green)
- **200,000 - 400,000**: Good (Blue)
- **400,000 - 600,000**: Average (Yellow)
- **> 600,000**: Poor (Red) - Possible mastitis

## API Integration

### For Scale Manufacturers

If you're integrating a scale system, use the Supabase REST API:

**Endpoint:** `POST /rest/v1/milk_production`

**Headers:**
- `apikey`: Your Supabase anon key
- `Authorization`: Bearer [anon key]
- `Content-Type`: application/json
- `Prefer`: return=minimal

**Required Fields:**
- `animal_id` (UUID)
- `measurement_date` (DATE)
- `measurement_time` (TIME)
- `milk_quantity` (DECIMAL)

**Optional Fields:**
- `milk_temperature`
- `session_type` (morning/afternoon/evening/other)
- `milking_duration` (seconds)
- `flow_rate`
- `conductivity`
- `scale_device_id`
- `notes`

## Troubleshooting

### Data Not Appearing in Realtime

1. Check that realtime is enabled in Supabase Dashboard:
   - Go to Database > Publications
   - Ensure `supabase_realtime` includes `milk_production` and `milk_tests`

2. Check browser console for websocket errors

### Permission Issues

Ensure your user has the `animals` permission to access the Pienas module.

## Future Enhancements

Potential additions:
- Bulk import from CSV/Excel
- Export to dairy management systems
- Automated alerts for low production or high SCC
- Trend graphs and predictions
- Integration with feeding systems
- Mastitis detection AI

## Support

For issues or questions, check the application logs or contact your system administrator.
