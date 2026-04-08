# Quick Start - Technika Kiemas Enhancement

## 🚀 Quick Setup (3 Steps)

### Step 1: Apply the SQL Migration
```bash
# The migration file is ready at:
# supabase/migrations/20260408000001_enhance_technika_assignments.sql

# Apply it using Supabase CLI:
supabase db push

# OR copy/paste the SQL into Supabase Dashboard SQL Editor
```

### Step 2: Restart Your Dev Server
```bash
# Stop your current dev server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

### Step 3: Test It Out!
1. Go to **Transportas** tab → Create a tractor
2. Go to **Sąskaitos** tab → Upload an invoice
3. Assign products to workers or vehicles

---

## 📋 What Changed?

### In Transportas Tab:
- ✅ New "Kategorija" field when creating/editing vehicles
- ✅ Auto-populates based on vehicle type
- ✅ Options: Traktorius or Sunkvežimis

### In Sąskaitos Tab:
When you upload an invoice and confirm it, the assignment modal now has:

**NEW: Priority Section at Top**
- 🟢 **Darbuotojui** button → Assign to worker
- 🟣 **Transportui** button → Assign to vehicle

**When you click "Darbuotojui":**
- Dropdown appears with all workers
- Select worker → Add notes → Priskirti

**When you click "Transportui":**
- Three sections appear:
  1. **Traktoriai** - Only tractors
  2. **Sunkvežimiai** - Only heavy transport
  3. **Kiti transportai** - Other vehicles
- Select from appropriate section → Add notes → Priskirti

---

## 🎯 Common Use Cases

### Assign Safety Boots to Worker
1. Upload invoice with safety boots
2. Confirm invoice
3. Click "Darbuotojui"
4. Select worker
5. Notes: "Winter safety boots 2026"
6. Click "Priskirti"

### Assign Oil Filter to Tractor
1. Upload invoice with oil filter
2. Confirm invoice
3. Click "Transportui"
4. In "Traktoriai" section, select tractor
5. Notes: "Regular maintenance"
6. Click "Priskirti"

### Assign Spare Parts to Truck
1. Upload invoice with spare parts
2. Confirm invoice
3. Click "Transportui"
4. In "Sunkvežimiai" section, select truck
5. Notes: "Brake pad replacement"
6. Click "Priskirti"

---

## 📊 View Assignments

### In Database:
```sql
-- Worker assignments
SELECT * FROM worker_equipment_assignments;

-- Vehicle assignments
SELECT * FROM vehicle_equipment_assignments;

-- Summary by worker
SELECT * FROM worker_assignment_summary;

-- Summary by vehicle
SELECT * FROM vehicle_assignment_summary;
```

---

## ❓ FAQ

**Q: Do I need to update existing vehicles?**
A: No, but you can optionally categorize them:
```sql
UPDATE vehicles SET vehicle_category = 'tractor' WHERE vehicle_type = 'tractor';
UPDATE vehicles SET vehicle_category = 'heavy_transport' WHERE vehicle_type = 'truck';
```

**Q: Can I still use the old assignment types?**
A: Yes! Tool, Building, Cost Center, etc. all still work.

**Q: What if a vehicle has no category?**
A: It will appear in the "Kiti transportai" section.

**Q: Can I assign one product to multiple workers/vehicles?**
A: No, each invoice item can only be assigned once. If you need to split, you'll need to create separate invoice items.

---

## 🐛 Troubleshooting

**Workers don't appear in dropdown:**
- Check that users exist and are not frozen
- Check browser console for errors

**Vehicle categories not showing:**
- Verify migration was applied
- Check: `SELECT vehicle_category FROM vehicles;`

**Assignment fails:**
- Check browser console
- Verify worker_id or vehicle_id is selected
- Check database constraints

---

## 📚 Full Documentation

For complete details, see:
- `IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `TECHNIKA_KIEMAS_CHANGES.md` - Technical documentation
- `supabase/migrations/20260408000001_enhance_technika_assignments.sql` - SQL migration

---

## ✅ Testing Checklist

- [ ] Migration applied successfully
- [ ] Dev server restarted
- [ ] Created tractor with category
- [ ] Created truck with category
- [ ] Uploaded invoice
- [ ] Assigned product to worker
- [ ] Assigned product to tractor
- [ ] Assigned product to truck
- [ ] Verified assignments in database views

---

**That's it! You're ready to use the enhanced Technika Kiemas system! 🎉**
