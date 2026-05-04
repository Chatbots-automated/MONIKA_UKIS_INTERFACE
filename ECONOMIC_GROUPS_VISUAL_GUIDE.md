# Visual Guide: Economic Groups Feature

## What Was Added

### 1. Veterinarija Module - Išvežti Gyvūnai

#### BEFORE:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Išvežti Gyvūnai                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Statusas │ Gyvūno Nr. │ Išvež. Data │ Lytis │ Pieno K. │ Mėsos K. │
│   OK     │ LT00008945 │ 2026-04-27  │ Karvė │    -     │    -     │
└─────────────────────────────────────────────────────────────────────┘
```

#### AFTER:
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Išvežti Gyvūnai                          [Valdyti ekonomines grupes] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Statusas │ Gyvūno Nr. │ Išvež. Data │ Lytis │ Ekonominė grupė      │ Pieno K. │ ... │
│   OK     │ LT00008945 │ 2026-04-27  │ Karvė │ [Dropdown v]         │    -     │     │
│          │            │             │       │ [Pelningos karvės]   │          │     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Economic Group Management Modal

When you click "Valdyti ekonomines grupes", a modal opens:

```
┌───────────────────────────────────────────────────────────┐
│ Ekonominių grupių valdymas                           [X]  │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Sukurti naują grupę ────────────────────────────────┐ │
│ │                                                        │ │
│ │ Pavadinimas *: [_________________________]            │ │
│ │                                                        │ │
│ │ Aprašymas:     [_________________________]            │ │
│ │                [_________________________]            │ │
│ │                                                        │ │
│ │ Spalva:        [████] #3B82F6  [Pavyzdys]            │ │
│ │                                                        │ │
│ │ [Sukurti]                                             │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─ Esamos grupės ──────────────────────────────────────┐ │
│ │                                                        │ │
│ │ [Pelningos karvės] Karvės, duodančios daug pieno [✏️] │ │
│ │ [Ūkio turtai] Gyvūnai, laikomi kaip ūkio turtas  [✏️] │ │
│ │ [Mėsinės karvės] Karvės, auginamos mėsai        [✏️] │ │
│ │ [Veršeliai] Jaunikliai                           [✏️] │ │
│ │ [Skerdimui] Gyvūnai, parduoti skerdimui          [✏️] │ │
│ │                                                        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3. Buhalterija Module - Ataskaitos

#### NEW TAB ADDED:

```
┌─────────────────────────────────────────────────────────────┐
│ Ataskaitos                            [Eksportuoti]        │
├─────────────────────────────────────────────────────────────┤
│ [Tiekėjai] [Mėnesinis] [PVM ataskaita] [Išvežti gyvūnai]  │ ← NEW!
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Išvežti gyvūnai                                            │
│                                                             │
│ Viso išvežta gyvūnų: 42                                   │
│ Su konfliktais: 3                                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Gyvūno Nr.  │ Išvež.Data │ Lytis │ Ekonominė grupė │ ...││
│ ├─────────────────────────────────────────────────────────┤│
│ │ LT00008945  │ 2026-04-27 │ Karvė │ [Pelningos karvės] │ ││
│ │ LT00009876  │ 2026-04-25 │ Bulius│ [Skerdimui]        │ ││
│ │ ...         │ ...        │ ...   │ ...                │ ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## User Workflow

### Creating a New Economic Group

1. Go to **Veterinarija** → **Išvežti Gyvūnai**
2. Click **"Valdyti ekonomines grupes"** button (top right)
3. In the modal:
   - Enter **Pavadinimas** (Name): e.g., "Eksportinės karvės"
   - Enter **Aprašymas** (Description): e.g., "Karvės, skirtos eksportui į kitas šalis"
   - Choose **Spalva** (Color): Click the color picker and select your preferred color
4. Click **"Sukurti"** (Create)
5. The new group appears in the list and becomes available in the dropdown

### Assigning a Group to an Animal

1. Go to **Veterinarija** → **Išvežti Gyvūnai**
2. Find the animal in the table
3. In the **"Ekonominė grupė"** column, click the dropdown
4. Select a group from the list (or "Nepriskirta" to unassign)
5. The change is saved automatically
6. A colored badge appears showing the group name

### Editing an Existing Group

1. Go to **Veterinarija** → **Išvežti Gyvūnai**
2. Click **"Valdyti ekonomines grupes"**
3. In the **"Esamos grupės"** section, click the [✏️] edit icon
4. The form is populated with the current values
5. Make your changes
6. Click **"Išsaugoti"** (Save)
7. All animals assigned to this group will reflect the updated information

### Viewing Reports

1. Go to **Buhalterija** → **Ataskaitos**
2. Click the **"Išvežti gyvūnai"** tab
3. Adjust the date range if needed
4. View the table showing:
   - All exported animals in the selected period
   - Their economic groups (with colored badges)
   - Conflict status
5. Click **"Eksportuoti"** to download as CSV

## Color Examples

The default groups use these colors:

- **Pelningos karvės** → 🟢 Green (#10B981)
- **Ūkio turtai** → 🔵 Blue (#3B82F6)
- **Mėsinės karvės** → 🔴 Red (#EF4444)
- **Veršeliai** → 🟠 Amber (#F59E0B)
- **Skerdimui** → ⚫ Gray (#6B7280)

## Database Schema

```sql
┌─────────────────────────────────────────────────────┐
│ economic_groups                                      │
├─────────────────────────────────────────────────────┤
│ id (UUID)              PRIMARY KEY                   │
│ name (TEXT)            UNIQUE                        │
│ description (TEXT)     NULLABLE                      │
│ color (TEXT)           DEFAULT '#3B82F6'            │
│ is_active (BOOLEAN)    DEFAULT true                 │
│ created_at (TIMESTAMP)                              │
│ updated_at (TIMESTAMP)                              │
└─────────────────────────────────────────────────────┘
                           │
                           │ (Referenced by)
                           ▼
┌─────────────────────────────────────────────────────┐
│ animal_departures                                    │
├─────────────────────────────────────────────────────┤
│ id (UUID)                                           │
│ animal_id (UUID)                                    │
│ animal_number (TEXT)                                │
│ ...                                                 │
│ economic_group_id (UUID) ← NEW! (FK)               │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

## CSV Export Format

When exporting from the Buhalterija report, the CSV will have this format:

```csv
Gyvūno Nr.,Išvežimo data,Lytis,Ekonominė grupė,Vieta,Statusas
"LT000008945497","2026-04-27","Karvė","Pelningos karvės","PANEVĖŽIO RAJONO ŽŪB 'BERČIŪNAI'","OK"
"LT000009876543","2026-04-25","Bulius","Skerdimui","UAB Skerdykla","Konfliktas"
```

## Notes

- The dropdown in the table allows quick assignment without opening a modal
- The colored badges provide visual identification at a glance
- The management modal allows creating unlimited custom groups
- All changes are saved to the database immediately
- The report in Buhalterija automatically shows the latest assignments
- Economic groups are farm-specific and can be customized to match your needs
