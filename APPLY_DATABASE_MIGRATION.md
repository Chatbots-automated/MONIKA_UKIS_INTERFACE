# Quick Start: Apply Database Migration

## ⚡ 3-Step Setup

### Step 1: Open Supabase SQL Editor

Go to your Supabase SQL Editor:
```
https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
```

### Step 2: Copy & Paste the Migration SQL

Copy the **entire contents** of this file:
```
flexible_medication_scheduling_migration.sql
```

Paste it into the SQL Editor.

### Step 3: Click "Run"

Execute the SQL. You should see success messages:
```
✅ Flexible medication scheduling system migration completed successfully
   - Fixed NOT NULL constraints on course_doses
   - Created course_medication_schedules table
   - Enhanced treatment_courses and animal_visits tables
   - Created helper functions and views
   - All existing courses marked as non-flexible (old system)
```

---

## ✅ Verification

After running the migration, verify it worked:

### Check New Table Exists
```sql
SELECT COUNT(*) FROM course_medication_schedules;
-- Should return 0 (empty table, ready to use)
```

### Check New Columns Added
```sql
SELECT
  medication_schedule_flexible,
  course_id
FROM treatment_courses
LIMIT 1;
-- Should show these columns exist (may be NULL for existing rows)
```

### Check Helper Functions
```sql
SELECT proname
FROM pg_proc
WHERE proname LIKE '%course%' OR proname LIKE '%medication%';
-- Should show several functions like get_scheduled_medications_for_visit
```

---

## 🎯 What This Migration Does

1. **Fixes Database Constraints**
   - Removes NOT NULL from `course_doses.dose_amount`
   - Allows NULL quantities until visit completion

2. **Creates New Table**
   - `course_medication_schedules` for flexible scheduling
   - Links medications to specific dates in a course

3. **Adds New Columns**
   - `medication_schedule_flexible` flag on `treatment_courses`
   - `course_id` reference on `animal_visits`

4. **Helper Functions**
   - 6 functions for course management
   - Validation and progress tracking

5. **Views for Reporting**
   - `vw_course_schedules` - Course overview
   - `vw_visits_needing_medication_entry` - Pending visits

---

## 🚨 Important Notes

### Backwards Compatible
- ✅ All existing courses continue working unchanged
- ✅ No data is deleted or modified
- ✅ Old system still works for legacy courses
- ✅ New system is opt-in (use "Planuoti kursą" button)

### Safe to Run
- ✅ Uses `IF NOT EXISTS` checks throughout
- ✅ No destructive operations
- ✅ Can be run multiple times safely
- ✅ All changes are additive only

### What Gets Created
- 1 new table: `course_medication_schedules`
- 2 new columns: `medication_schedule_flexible`, `course_id`
- 6 new functions for course management
- 2 new views for reporting
- Multiple indexes for performance
- RLS policies for security

---

## 🐛 Troubleshooting

### Error: "permission denied"
**Solution:** Make sure you're running the SQL as a superuser/admin in Supabase Dashboard.

### Error: "column already exists"
**Solution:** Migration was already applied. This is safe - just ignore the error.

### Error: "table already exists"
**Solution:** The migration can be run multiple times safely. The `IF NOT EXISTS` checks handle this.

### No errors but features don't work
**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for JavaScript errors
4. Verify migration completed (check verification queries above)

---

## 📞 Next Steps

After applying the migration:

1. **Refresh your application** - The frontend is already built and ready
2. **Test course creation** - Click "Naujas vizitas" → "Gydymas" → "Planuoti kursą"
3. **Create a test course** - Schedule 2-3 days with different medications
4. **Complete a visit** - Enter quantities and verify inventory deduction
5. **Check course progress** - View the course in animal detail sidebar

---

## 📚 Full Documentation

For complete details, see: `FLEXIBLE_MEDICATION_SYSTEM_README.md`

---

**Ready to Go!** 🚀

The database migration is ready to apply. The frontend code is already built and deployed. After running the migration SQL, the new flexible medication scheduling system will be fully operational.
