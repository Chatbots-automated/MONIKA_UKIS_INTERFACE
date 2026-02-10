# Veterinary Drug Journal - Before & After Comparison

## BEFORE (Old Format)

### Single Table with 10 Columns
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────┬────────┬────────┬──────────┬─────┬──────────┬────────┬────────┬─────────┬────────┐
│ Vaisto  │ Pirminė│ Gavimo │ Dokumen- │Gauta│Pagamin. │Tinkam. │Serija  │Sunaudot.│Likutis │
│ pavadin.│pakuotė │  data  │to info   │kiek.│  data   │naudoti │        │  kiekis │        │
├─────────┼────────┼────────┼──────────┼─────┼──────────┼────────┼────────┼─────────┼────────┤
│Medicine │  ml    │2024-01 │SF-001    │100  │2023-12-01│2025-12 │B-001   │   50    │   50   │
│   A     │        │  -15   │2024-01-10│     │          │  -01   │        │         │        │
├─────────┼────────┼────────┼──────────┼─────┼──────────┼────────┼────────┼─────────┼────────┤
│Medicine │  ml    │2024-02 │SF-002    │ 50  │2024-01-15│2026-01 │B-002   │   20    │   30   │
│   A     │        │  -01   │2024-02-01│     │          │  -15   │        │         │        │
├─────────┼────────┼────────┼──────────┼─────┼──────────┼────────┼────────┼─────────┼────────┤
│Medicine │  g     │2024-01 │SF-003    │200  │2023-11-01│2025-11 │B-003   │  150    │   50   │
│   B     │        │  -20   │2024-01-20│     │          │  -01   │        │         │        │
└─────────┴────────┴────────┴──────────┴─────┴──────────┴────────┴────────┴─────────┴────────┘
```

**Problems:**
- Medicine name repeated for every batch
- Hard to see all batches for one medicine
- No totals per medicine
- Cluttered with repeated information
- 10 columns = information overload

---

## AFTER (New 2024 Format)

### Grouped by Medicine with Header + 7 Column Table

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS                 │
└─────────────────────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════════════════════╗
║ MEDICINE HEADER                                                                 ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║ Veterinarinio vaisto pavadinimas: Medicine A                                   ║
║ 📋 Reg. kodas: VET-001                                                          ║
║ 💊 Veiklioji medžiaga: Substance X                                              ║
║                                                                                 ║
║ Pirminė pakuotė (mato vnt.): ml                                                ║
╚═════════════════════════════════════════════════════════════════════════════════╝

┌────────┬──────────────────────┬─────────┬──────────┬────────┬─────────┬────────┐
│Gavimo  │Dokumento pavadinimas,│ Gautas  │Tinkamum. │Serija  │Sunaudot.│Likutis │
│ data   │  numeris, data       │ kiekis  │ naudoti  │        │ kiekis  │        │
├────────┼──────────────────────┼─────────┼──────────┼────────┼─────────┼────────┤
│2024-01 │Sąskaita faktūra      │   100   │2025-12-01│ B-001  │   50    │   50   │
│  -15   │Nr. SF-001            │         │          │        │         │        │
│        │2024-01-10            │         │          │        │         │        │
├────────┼──────────────────────┼─────────┼──────────┼────────┼─────────┼────────┤
│2024-02 │Sąskaita faktūra      │    50   │2026-01-15│ B-002  │   20    │   30   │
│  -01   │Nr. SF-002            │         │          │        │         │        │
│        │2024-02-01            │         │          │        │         │        │
├────────┼──────────────────────┼─────────┼──────────┼────────┼─────────┼────────┤
│        │  Viso (Medicine A):  │   150   │          │        │   70    │   80   │
└────────┴──────────────────────┴─────────┴──────────┴────────┴─────────┴────────┘

╔═════════════════════════════════════════════════════════════════════════════════╗
║ MEDICINE HEADER                                                                 ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║ Veterinarinio vaisto pavadinimas: Medicine B                                   ║
║ 📋 Reg. kodas: VET-002                                                          ║
║ 💊 Veiklioji medžiaga: Substance Y                                              ║
║                                                                                 ║
║ Pirminė pakuotė (mato vnt.): g                                                 ║
╚═════════════════════════════════════════════════════════════════════════════════╝

┌────────┬──────────────────────┬─────────┬──────────┬────────┬─────────┬────────┐
│Gavimo  │Dokumento pavadinimas,│ Gautas  │Tinkamum. │Serija  │Sunaudot.│Likutis │
│ data   │  numeris, data       │ kiekis  │ naudoti  │        │ kiekis  │        │
├────────┼──────────────────────┼─────────┼──────────┼────────┼─────────┼────────┤
│2024-01 │Sąskaita faktūra      │   200   │2025-11-01│ B-003  │  150    │   50   │
│  -20   │Nr. SF-003            │         │          │        │         │        │
│        │2024-01-20            │         │          │        │         │        │
├────────┼──────────────────────┼─────────┼──────────┼────────┼─────────┼────────┤
│        │  Viso (Medicine B):  │   200   │          │        │  150    │   50   │
└────────┴──────────────────────┴─────────┴──────────┴────────┴─────────┴────────┘
```

**Improvements:**
✅ Medicine information in header (not repeated)
✅ All batches for one medicine grouped together
✅ Summary totals per medicine
✅ Only 7 columns (cleaner, easier to read)
✅ Document title/name included
✅ Better visual hierarchy
✅ Compliant with 2024 official format

---

## Key Differences

| Aspect | Old Format | New Format |
|--------|-----------|------------|
| **Structure** | Flat list | Grouped by medicine |
| **Columns** | 10 columns | 7 columns |
| **Medicine Info** | Repeated per row | Once in header |
| **Document Info** | Split fields | Combined field |
| **Totals** | None | Per medicine |
| **Visual Clarity** | Low | High |
| **Print Layout** | Can split awkwardly | Keeps groups together |
| **Compliance** | Old format | 2024 official format |

---

## Technical Changes

### 1. Frontend (ReportTemplates.tsx)
- Data grouped by `product_id` or `product_name`
- Each medicine renders as a separate block
- Header section with medicine details
- Table with only batch-specific data
- Summary row calculates totals

### 2. Backend (Database View)
- Added `doc_title` field to view
- Added `lot` field (in addition to `batch_number`)
- All other fields remain the same

### 3. Styling (index.css)
- Added `.page-break-inside-avoid` for printing
- Ensures medicine groups stay together on printed pages
