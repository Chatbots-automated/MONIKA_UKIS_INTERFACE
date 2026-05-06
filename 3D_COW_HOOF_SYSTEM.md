# 3D Interactive Cow Hoof Examination System

## 🐄 Overview

A fully interactive 3D cow model system for precise hoof examination and zone tracking. Users can click on a 3D cow model, zoom into legs, select claws, and precisely mark hoof zones (0-10) for veterinary records.

## ✨ Features

### 1. **Full 3D Cow Model**
- Realistic geometric cow with body, head, udder, tail, spots (Holstein pattern)
- 4 clickable legs (FL, FR, HL, HR)
- Hover effects with visual feedback
- Smooth animations on interaction

### 2. **Multi-Stage Workflow**
```
Stage 1: Full Cow View
   ↓ (Click on a leg)
Stage 2: Claw Selection
   ↓ (Select inner or outer claw)
Stage 3: Zone Selection
   ↓ (Click on zones 0-10)
Complete!
```

### 3. **Smooth Camera Animations**
- Automatic camera transitions between stages
- Smooth lerp-based camera movements
- Maintains orbital control at all stages

### 4. **Interactive Elements**
- **Legs**: Color changes on hover (brown → light blue)
- **Claws**: Visual feedback when hovering/selected
- **Zones**: Color-coded (green shades), highlights on selection
- **Back Button**: Navigate back through stages

### 5. **Visual Feedback**
- Current stage indicator (🐄 → 🦶 → 🎯)
- Selected items display in top-right corner
- Instructions in bottom-left corner
- Cursor changes to pointer on hover

## 🎮 How to Use

### Step 1: Select Cow
1. Navigate to Veterinarija → Nagos
2. Click "Nauja apžiūra"
3. Search for cow by ear tag or collar number
4. Select examination date and technician name

### Step 2: Select Leg on 3D Cow
- **View**: Full 3D cow model appears
- **Action**: Click on any of the 4 legs:
  - **FL**: Front Left (Priekinė Kairė)
  - **FR**: Front Right (Priekinė Dešinė)
  - **HL**: Hind Left (Galinė Kairė)
  - **HR**: Hind Right (Galinė Dešinė)
- **Feedback**: Leg turns blue when selected, camera zooms

### Step 3: Select Claw
- **View**: Two 3D claw representations
- **Action**: Click on:
  - **Inner** (Vidinis nagas)
  - **Outer** (Išorinis nagas)
- **Feedback**: Selected claw turns blue

### Step 4: Select Zone
- **View**: Detailed hoof zone map (0-10)
- **Action**: Click on any zone to examine
- **Modal Opens**: Record details:
  - Condition type (OK, WLD, AF, ID, etc.)
  - Severity (0-4)
  - Was trimmed/treated
  - Bandage applied
  - Medicine details (product, batch, quantity)
  - Follow-up requirements
  - Notes

### Step 5: Save
- Can examine multiple zones before saving
- All examinations saved together
- Each zone creates a separate database record

## 🎨 3D Model Details

### Cow Anatomy Created
- **Body**: 2×1.2×3.5 units (white with black spots)
- **Head**: 0.9×0.9×1.2 units with pink snout
- **Ears**: Black, angled outward
- **Horns**: Cream-colored, curved
- **Legs**: Brown cylinders (4×)
- **Hoofs**: Dark brown boxes
- **Udder**: Pink sphere under body
- **Tail**: Brown with black tuft

### Interactive Zones (per hoof)
```
Zone Layout:
┌────────┬────────┬────────┐
│ Zone 4 │ Zone 6 │ Zone 7 │
├────────┼────────┼────────┤
│ Zone 3 │ Zone 0 │ Zone 8 │
├────────┼────────┼────────┤
│ Zone 2 │ Zone 5 │ Zone 9 │
├────────┼────────┼────────┤
│ Zone 1 │        │ Zone10 │
└────────┴────────┴────────┘
```

## 🎯 Camera System

### Stage Positions
- **Cow View**: Position `(0, 3, 10)` - Wide view showing full cow
- **Claw View**: Position `(0, 0, 6)` - Medium zoom on claws
- **Zone View**: Position `(0, 0, 8)` - Close zoom on zones

### Animation
- Uses `lerp` (linear interpolation) for smooth transitions
- Interpolation factor: 0.05 (smooth but responsive)
- Both position and look-at target are animated

## 📁 Files Created

### New Components
1. **`CowModel3D.tsx`** - Full 3D cow with clickable legs
   - Cow body, head, legs, udder, tail
   - Interactive leg components
   - Hover states and selection feedback

2. **`HoofViewer3DEnhanced.tsx`** - Multi-stage viewer
   - Stage management (cow/claw/zone)
   - Camera controller
   - Claw selector
   - Zone selector
   - Navigation controls

### Modified Components
3. **`Hoofs3D.tsx`** - Main examination component
   - Updated to use enhanced viewer
   - Removed button-based leg selection
   - Integrated single 3D view workflow

## 🛠️ Technical Details

### Dependencies
```json
{
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.88.0",
  "three": "^0.160.0"
}
```

### Key Three.js Features Used
- **Geometries**: BoxGeometry, CylinderGeometry, SphereGeometry
- **Materials**: MeshStandardMaterial with emissive properties
- **Lighting**: Ambient, Directional, Point lights
- **Controls**: OrbitControls for camera manipulation
- **Animation**: useFrame hook for smooth transitions
- **Text**: 3D text labels using @react-three/drei

### Performance
- Optimized geometry (low poly counts)
- Efficient hover state management
- Smooth animations without lag
- Responsive on modern browsers

## 🎨 Color Scheme

### Cow Colors
- Body: `#ffffff` (white)
- Spots: `#1a1a1a` (black)
- Snout: `#ffc0cb` (pink)
- Udder: `#ffc0cb` (pink)
- Legs: `#8b4513` (brown)
- Hoofs: `#2c1810` (dark brown)
- Horns: `#e8dcc0` (cream)

### Interactive Colors
- Normal: Brown `#8b4513`
- Hover: Light Blue `#60a5fa`
- Selected: Blue `#3b82f6`

### Zone Colors
- Gradient from light green `#e8f5e9` to dark green `#0d4f1c`
- Selected: Blue `#2196f3`
- Hover: Yellow `#ffeb3b`
- Examined: Orange `#ff9800`

## 🚀 Advantages Over Button Selection

### Old System
- Click button for leg → Click button for claw → See 3D zones
- Less intuitive
- More abstract

### New System ✅
- Click directly on 3D cow leg → Click on 3D claw → See 3D zones
- More intuitive and visual
- Feels like examining a real cow
- Easier to understand spatial relationships
- More engaging user experience
- Professional veterinary tool appearance

## 🔧 Future Enhancements (Optional)

1. **Higher Detail Model**
   - Import GLTF model of actual cow
   - Realistic textures and materials
   - Animated tail/ears

2. **Multiple Camera Angles**
   - Top view, side view, front view buttons
   - Preset camera positions

3. **Zone Highlighting**
   - Show previously affected zones in different colors
   - Historical heat map of problem areas

4. **Sound Effects**
   - Soft "moo" when clicking cow
   - Click sounds for selections

5. **Mobile Optimization**
   - Touch-friendly controls
   - Larger touch targets

## 📊 Database Integration

All zone data is stored in the `hoof_records` table with the `zone` field (0-10).

Example record:
```sql
INSERT INTO hoof_records (
  animal_id,
  examination_date,
  leg,
  claw,
  zone,
  condition_code,
  severity,
  ...
) VALUES (
  'uuid-here',
  '2026-05-06',
  'FL',
  'inner',
  3,
  'WLD',
  2,
  ...
);
```

## 🎓 User Training Notes

### For Veterinarians
1. The 3D cow represents your examination flow
2. Click on the actual leg you're examining
3. The camera will zoom in automatically
4. Select inner or outer claw
5. Click on the affected zone(s)
6. Record findings in the modal

### Common Questions
- **Q**: Can I rotate the view?
  **A**: Yes! Drag to rotate, scroll to zoom
  
- **Q**: How do I go back?
  **A**: Click the "← Grįžti" button or click the same selection again
  
- **Q**: Can I examine multiple zones?
  **A**: Yes! Click zones one by one, then save all together

## ✅ Testing Checklist

- [x] 3D cow model renders correctly
- [x] All 4 legs are clickable
- [x] Hover effects work on legs
- [x] Camera zooms smoothly to leg
- [x] Claw selection appears after leg click
- [x] Zone selection appears after claw click
- [x] Zones are clickable and show modal
- [x] Back button works correctly
- [x] Multiple zones can be examined
- [x] Data saves to database correctly
- [x] No console errors
- [x] Responsive on different screen sizes

---

**Implementation Date**: May 6, 2026  
**Status**: ✅ Complete and Tested  
**Dev Server**: http://localhost:5174/  
**Module**: Veterinarija → Nagos
