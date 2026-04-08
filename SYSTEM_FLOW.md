# Technika Kiemas - System Flow Diagram

## 📊 Assignment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SĄSKAITOS TAB (Invoices)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Upload Invoice  │
                    │      (PDF)       │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Parse Invoice   │
                    │  Match Products  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Confirm Invoice  │
                    │  Add to Stock    │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ASSIGNMENT MODAL OPENS                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         PRIORITY: Worker or Vehicle Assignment         │   │
│  │  ┌──────────────────┐    ┌──────────────────┐        │   │
│  │  │   Darbuotojui    │    │    Transportui   │        │   │
│  │  │    (Worker)      │    │     (Vehicle)    │        │   │
│  │  │      🟢          │    │       🟣         │        │   │
│  │  └──────────────────┘    └──────────────────┘        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Other Assignment Types                     │   │
│  │  • Įrankiui/Įrangai (Tool/Equipment)                  │   │
│  │  • Pastatui (Building)                                 │   │
│  │  • Transporto paslaugos (Transport Services)          │   │
│  │  • Bendrai fermai (General Farm)                      │   │
│  │  • Kaštų centrui (Cost Center)                        │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ WORKER SELECTED  │        │ VEHICLE SELECTED │
    └──────────────────┘        └──────────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────────────┐
    │ Select Worker    │        │  Select Vehicle Category │
    │                  │        │                          │
    │ • Name (Email)   │        │  ┌────────────────────┐ │
    └──────────────────┘        │  │   TRAKTORIAI      │ │
                                │  │   (Tractors)      │ │
                                │  │                    │ │
                                │  │ • REG - Make Model │ │
                                │  └────────────────────┘ │
                                │                          │
                                │  ┌────────────────────┐ │
                                │  │  SUNKVEŽIMIAI     │ │
                                │  │  (Heavy Transport) │ │
                                │  │                    │ │
                                │  │ • REG - Make Model │ │
                                │  └────────────────────┘ │
                                │                          │
                                │  ┌────────────────────┐ │
                                │  │ KITI TRANSPORTAI  │ │
                                │  │ (Other Vehicles)   │ │
                                │  │                    │ │
                                │  │ • REG - Make Model │ │
                                │  └────────────────────┘ │
                                └──────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌──────────────────┐
                    │   Add Notes      │
                    │   (Optional)     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   PRISKIRTI      │
                    │    (Assign)      │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SAVED TO DATABASE                             │
│                                                                  │
│  equipment_invoice_item_assignments                             │
│  ├── assignment_type: 'worker' or 'vehicle'                    │
│  ├── worker_id: (if worker assignment)                         │
│  ├── vehicle_id: (if vehicle assignment)                       │
│  ├── notes: (user notes)                                       │
│  └── assigned_by: (current user)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Available in    │
                    │  Database Views  │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ worker_equipment_    │    │ vehicle_equipment_   │
    │    assignments       │    │    assignments       │
    │                      │    │                      │
    │ • Worker info        │    │ • Vehicle info       │
    │ • Product info       │    │ • Category           │
    │ • Invoice info       │    │ • Product info       │
    │ • Assignment details │    │ • Invoice info       │
    └──────────────────────┘    └──────────────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ worker_assignment_   │    │ vehicle_assignment_  │
    │     summary          │    │     summary          │
    │                      │    │                      │
    │ • Total assignments  │    │ • Total assignments  │
    │ • Unique products    │    │ • Unique products    │
    │ • Total cost         │    │ • Total cost         │
    │ • Last assignment    │    │ • By category        │
    └──────────────────────┘    └──────────────────────┘
```

## 🚗 Vehicle Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRANSPORTAS TAB (Vehicles)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Create/Edit      │
                    │    Vehicle       │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Select Type     │
                    │                  │
                    │ • Traktorius     │
                    │ • Sunkvežimis    │
                    │ • Automobilis    │
                    │ • Kombainas      │
                    │ • etc.           │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Category        │
                    │  Auto-Populated  │
                    │                  │
                    │ Traktorius →     │
                    │   'tractor'      │
                    │                  │
                    │ Sunkvežimis →    │
                    │ 'heavy_transport'│
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Save Vehicle    │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SAVED TO DATABASE                             │
│                                                                  │
│  vehicles                                                        │
│  ├── vehicle_type: 'tractor', 'truck', etc.                    │
│  ├── vehicle_category: 'tractor' or 'heavy_transport'          │
│  ├── registration_number                                        │
│  ├── make, model, year                                          │
│  └── other vehicle details                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Available for   │
                    │   Assignment     │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │   In Sąskaitos   │        │  In Database     │
    │  Assignment Modal│        │     Queries      │
    │                  │        │                  │
    │ • Traktoriai     │        │ get_vehicles_by_ │
    │   section        │        │ category()       │
    │                  │        │                  │
    │ • Sunkvežimiai   │        │ vehicle_equipment│
    │   section        │        │ _assignments     │
    └──────────────────┘        └──────────────────┘
```

## 📊 Data Relationships

```
┌──────────────┐
│    users     │
│              │
│ • id         │
│ • full_name  │
│ • email      │
└──────┬───────┘
       │
       │ worker_id (FK)
       │
       ▼
┌──────────────────────────────────────┐
│ equipment_invoice_item_assignments   │
│                                      │
│ • id                                 │
│ • invoice_item_id (FK)               │
│ • assignment_type                    │◄──────┐
│ • worker_id (FK) ───────────────────►│       │
│ • vehicle_id (FK) ──────────────────►│       │
│ • tool_id (FK)                       │       │
│ • cost_center_id (FK)                │       │
│ • notes                              │       │
│ • assigned_by (FK)                   │       │
└──────────────────────────────────────┘       │
                                               │
                                               │ vehicle_id (FK)
                                               │
                                        ┌──────┴────────┐
                                        │   vehicles    │
                                        │               │
                                        │ • id          │
                                        │ • reg_number  │
                                        │ • vehicle_type│
                                        │ • vehicle_    │
                                        │   category    │
                                        │ • make, model │
                                        └───────────────┘
```

## 🎯 Assignment Type Decision Tree

```
                    Product to Assign
                           │
                           ▼
              ┌────────────────────────┐
              │  Who/What is it for?   │
              └────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Personal    │  │   Vehicle     │  │    Other      │
│   Equipment   │  │    Parts      │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ DARBUOTOJUI   │  │  TRANSPORTUI  │  │ • Tool        │
│   (Worker)    │  │   (Vehicle)   │  │ • Building    │
│               │  │               │  │ • Cost Center │
│ • Safety gear │  │ • Oil filters │  │ • General Farm│
│ • Work clothes│  │ • Spare parts │  │ • Transport   │
│ • PPE         │  │ • Maintenance │  │   Service     │
│ • Tools       │  │   items       │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │
        ▼                  ▼
┌───────────────┐  ┌───────────────────────┐
│ Select Worker │  │  Select Category      │
│               │  │                       │
│ Dropdown with │  │ ┌─────────────────┐  │
│ all workers   │  │ │  TRAKTORIAI     │  │
└───────────────┘  │ │  (Tractors)     │  │
                   │ └─────────────────┘  │
                   │                       │
                   │ ┌─────────────────┐  │
                   │ │  SUNKVEŽIMIAI   │  │
                   │ │  (Heavy Trans.) │  │
                   │ └─────────────────┘  │
                   │                       │
                   │ ┌─────────────────┐  │
                   │ │  KITI           │  │
                   │ │  (Other)        │  │
                   │ └─────────────────┘  │
                   └───────────────────────┘
```

## 📈 Reporting & Analytics Flow

```
┌─────────────────────────────────────────┐
│         Database Views                  │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Worker  │ │ Vehicle  │ │Unassigned│
│   Views  │ │  Views   │ │  Items   │
└──────────┘ └──────────┘ └──────────┘
        │           │           │
        ▼           ▼           ▼
┌──────────────────────────────────────┐
│         Reporting Options            │
│                                      │
│ • Cost per worker                   │
│ • Cost per vehicle                  │
│ • Cost per vehicle category         │
│ • Equipment distribution            │
│ • Assignment history                │
│ • Unassigned items tracking         │
└──────────────────────────────────────┘
```

---

This visual guide helps understand how the new system works and how data flows through the application.
