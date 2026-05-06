# 3D Hoof Management System Implementation

## Overview
A comprehensive 3D interactive hoof examination and tracking system for the Veterinarija module, allowing veterinarians to record detailed hoof conditions with precise zone-based tracking.

## Features Implemented

### 1. 3D Interactive Hoof Viewer
- **Technology**: React Three Fiber + Three.js
- **File**: `src/components/HoofViewer3D.tsx`
- **Capabilities**:
  - Interactive 3D model of cow hoofs
  - 11 clickable zones (0-10) based on veterinary hoof charts
  - Orbital camera controls (rotate, zoom, pan)
  - Visual feedback for examined zones
  - Color-coded zone representation
  - Real-time zone selection highlighting

### 2. Enhanced Hoofs Module
- **File**: `src/components/Hoofs3D.tsx`
- **Features**:
  - Search by **Ear Tag Number** (ausies nr / tag_no)
  - Search by **Collar Number** (kaklo nr / collar_no) from GEA system
  - Step-by-step examination workflow:
    1. Select cow (by ear or collar number)
    2. Select leg (FL, FR, HL, HR)
    3. Select claw (Inner/Outer)
    4. Select zone (0-10) via 3D model
    5. Record condition, treatment, and follow-up needs
  - Multiple zone examinations per session
  - Treatment recording with product and batch tracking
  - Follow-up scheduling
  - Comprehensive examination history

### 3. Database Enhancements
- **Migration**: `supabase/migrations/20260506000001_add_hoof_zones.sql`
- **Changes**:
  - Added `zone` column to `hoof_records` table (INTEGER, 0-10)
  - Created/updated `hoof_condition_codes` table with common lesion types:
    - OK - Healthy (Sveikas)
    - WLD - White Line Disease (Baltosios linijos liga)
    - AF - Axial Fissure (Ašinė fisūra)
    - ID - Interdigital Dermatitis (Tarppiršlio dermatitas)
    - HF - Horizontal Fissure (Horizontali fisūra)
    - TU - Toe Ulcer (Kolelateralinė žaizda)
    - VF - Vertical Fissure (Vertikali fisūra)
    - IP - Interdigital Phlegmon (Tarppiršlio flegmona)
    - DD - Digital Dermatitis (Skaitmeninis dermatitas)
    - SU - Sole Ulcer (Padės opinis)
    - HE - Heel Erosion (Kulno erozija)

### 4. Navigation Updates
- **File**: `src/components/Layout.tsx`
- Added "Nagos" menu item to the Veterinarija module
- Uses Activity icon for consistent UI

### 5. Application Integration
- **File**: `src/App.tsx`
- Replaced old `Hoofs` component with new `Hoofs3D`
- Seamless integration with existing module system

## Hoof Zone Mapping

Based on standard veterinary hoof charts:

```
Zone Layout (Bottom View):
┌─────────────┬─────────────┬─────────┐
│   Zone 4    │   Zone 6    │ Zone 7  │
├─────────────┼─────────────┼─────────┤
│   Zone 3    │   Zone 0    │ Zone 8  │
│             │  (Center)   │         │
├─────────────┼─────────────┼─────────┤
│   Zone 2    │   Zone 5    │ Zone 9  │
├─────────────┼─────────────┼─────────┤
│   Zone 1    │             │ Zone 10 │
└─────────────┴─────────────┴─────────┘
     Inner        Central      Outer
     Claw                      Claw
```

## How to Use

### 1. Access the Module
1. Log into the VetStock system
2. Select "Veterinarija" module
3. Click "Nagos" in the left sidebar

### 2. Create New Examination
1. Click "Nauja apžiūra" button
2. **Search for cow**: Enter ear tag number OR collar number
3. **Select leg**: Choose from Front Left, Front Right, Hind Left, Hind Right
4. **Select claw**: Choose Inner or Outer claw
5. **Interact with 3D model**:
   - Click on any zone (0-10) to examine
   - Rotate model by dragging
   - Zoom with mouse wheel
   - Pan by right-click dragging

### 3. Record Zone Examination
When you click a zone, a detailed form opens:
- **Condition**: Select lesion type (OK, WLD, AF, ID, etc.)
- **Severity**: 0-4 scale (0=Healthy, 4=Very Severe)
- **Actions**:
  - Was trimmed? (checkbox)
  - Was treated? (checkbox)
  - Bandage applied? (checkbox)
  - Requires follow-up? (checkbox with date picker)
- **Treatment Details** (if treated):
  - Product selection
  - Batch selection
  - Quantity and unit
  - Treatment notes
- **Notes**: Additional observations

### 4. Save Examinations
- You can examine multiple zones before saving
- All examinations are saved together
- Each zone creates a separate record in the database

### 5. View History
- Filter by condition type
- Filter by severity level
- Filter by date range
- Search by animal
- View zone-specific examination history

## Database Migration Instructions

To apply the database migration:

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open `supabase/migrations/20260506000001_add_hoof_zones.sql`
4. Copy and paste the SQL
5. Click "Run"

### Option 2: Via Migration Script
```bash
# Create a new migration script or update existing one
# Add the migration filename to the migrations array
npm run migrate
```

### Option 3: Via Supabase CLI
```bash
npx supabase db push
```

## Technical Details

### Dependencies Added
- `@react-three/fiber@^8.15.0` - React renderer for Three.js
- `@react-three/drei@^9.88.0` - Helper components for R3F
- `three@^0.160.0` - 3D graphics library

### Performance Considerations
- 3D rendering is optimized for smooth interaction
- Only active examinations are rendered in 3D
- Historical data uses standard table view
- Lazy loading of collar numbers from GEA system

### Data Flow
1. User selects cow → Loads animal data + collar number from `vw_animal_latest_collar`
2. User interacts with 3D model → Updates local state
3. User saves examination → Inserts records with zone data
4. History view → Joins animals + conditions + zones

## Files Modified/Created

### New Files
- `src/components/HoofViewer3D.tsx` - 3D visualization component
- `src/components/Hoofs3D.tsx` - Main hoofs management component
- `supabase/migrations/20260506000001_add_hoof_zones.sql` - Database migration
- `HOOF_3D_IMPLEMENTATION.md` - This documentation

### Modified Files
- `src/App.tsx` - Updated import and route
- `src/components/Layout.tsx` - Added menu item
- `package.json` - Added Three.js dependencies

## Future Enhancements (Optional)

1. **More Detailed 3D Model**: 
   - Import actual 3D cow hoof models
   - Texture mapping for realistic appearance
   - Multiple viewing angles

2. **Analytics Dashboard**:
   - Heat map of most affected zones
   - Trend analysis by zone
   - Lesion type frequency charts

3. **Photo Upload**:
   - Attach photos to zone examinations
   - Side-by-side comparison with 3D zones

4. **Export/Reporting**:
   - Generate hoof examination reports
   - Export zone-specific statistics
   - PDF reports with 3D zone diagrams

## Support

For questions or issues:
1. Check the console for error messages
2. Verify database migration was applied successfully
3. Ensure collar numbers are being synced from GEA system
4. Contact system administrator

---

**Implementation Date**: May 6, 2026  
**Status**: ✅ Complete and Ready for Use  
**Dev Server**: http://localhost:5174/
