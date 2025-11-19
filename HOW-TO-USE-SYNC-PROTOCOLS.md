# How to Use Synchronization Protocols - Quick Guide

## 🚀 Quick Start

### Step 1: Apply Database Migration (ONE TIME ONLY)

**Before using the system**, you must create the database tables:

1. Open this link: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
2. Open the file `SYNC-MIGRATION-SQL.sql` in this project
3. Copy ALL the SQL code
4. Paste into Supabase SQL Editor
5. Click "RUN" button
6. Wait for "Success" message

✅ **You only need to do this once!**

---

## 📋 Using Synchronization Protocols

### Starting a New Protocol

**Step 1:** Open an Animal
- Click on any animal from your animals list
- The sidebar will open on the right

**Step 2:** Add a Visit
- Click the "Pridėti vizitą" (Add Visit) button
- Set the visit date and time

**Step 3:** Select Gydymas Procedure
- In the "Procedūros" section, check **Gydymas**
- Scroll down - you'll see a new purple section appear

**Step 4:** Find Sinchronizacija Section
- Look for the purple/pink gradient box
- Title: "Sinchronizacijos protokolas"
- Click the button "Pradėti sinchronizacijos protokolą"

**Step 5:** Configure Protocol
- **Protocol:** Select from dropdown
  - Ovsinhr 56 (4 days)
  - GGPG (17 days)
  - G7G (20 days)
- **Start Date:** Choose when to begin
- **Preview:** Review the timeline that appears

**Step 6:** Start Protocol
- Click "Pradėti protokolą"
- System creates all steps automatically
- Protocol is now active!

---

## ✅ Completing Protocol Steps

### Daily Workflow

**View Active Protocol:**
- Open the animal's sidebar
- Select Gydymas procedure
- You'll see the protocol with all steps

**Step Colors Mean:**
- 🟢 **Green** = Completed (with checkmark)
- 🟡 **Yellow** = Today's task
- 🔴 **Red** = Overdue (missed)
- 🔵 **Blue** = Coming up soon (1-2 days)
- ⚪ **Gray** = Future steps

**Complete a Step:**
1. Find the step that needs to be done
2. Click "Atlikti" button
3. Enter dosage amount (e.g., "10")
4. Enter unit (e.g., "ml")
5. Optionally enter batch ID
6. Click OK

**What Happens:**
- ✅ Step marked complete with green checkmark
- 📊 Progress bar updates
- 📦 Inventory automatically deducted
- 📝 Completion time recorded

---

## 💉 Recording Insemination

**When to Record:**
- After the "Sėklinti" step is reached
- Can be updated anytime

**How to Record:**
1. Find the "Sėklinimas" section in the purple box
2. Click "Redaguoti sėklinimą"
3. Enter date (YYYY-MM-DD format)
4. Enter insemination number (bull/semen ID)
5. Click OK

**Example:**
- Date: 2025-11-27
- Number: BULL-12345

---

## 📊 Monitoring Progress

### Progress Bar
Shows completion percentage at the top of the protocol box:
```
Progress: 3 / 6 steps
[████████░░░░] 50%
```

### Step Details
Each step shows:
- ✅ Completion status
- 📅 Scheduled date
- 💊 Medication name
- 🌙 "Vakare" badge if evening dose
- ⏰ Completion timestamp (when done)

---

## 🔄 Modifying Protocols

### Change Step Date
1. Complete the step on the new date
2. System records actual completion time
3. Date flexibility is built-in

### Cancel Protocol
1. Click the ❌ (X) button at top-right
2. Confirm cancellation
3. Protocol status changes to "Cancelled"
4. Can start a new protocol if needed

---

## 📝 Protocol Results

### Document Outcome
After protocol completes:
1. Enter results in "Rezultatas" field
2. Note: pregnancy confirmation, success/failure, etc.
3. Saves automatically

**Example Results:**
- "Sėklinta sėkmingai, nustatyta vešlumas po 30 dienų"
- "Protokolas nesėkmingas, kartoti po 2 savaičių"
- "Gyvūnas nėščias, numatoma veršio data: 2025-08-15"

---

## 🔍 Understanding the Protocols

### Ovsinhr 56 (Fast Protocol)
**Duration:** 4 days
**Use:** Quick synchronization

| Day | Step | Medication | Notes |
|-----|------|------------|-------|
| 0 | 1 | Ovarelin | Start |
| 2 | 2 | Enzaprost | |
| 3 | 3 | Ovarelin vakare | Evening dose |
| 4 | 4 | Sėklinti | Insemination |

---

### GGPG (Standard Protocol)
**Duration:** 17 days
**Use:** Standard breeding sync

| Day | Step | Medication | Notes |
|-----|------|------------|-------|
| 0 | 1 | Ovarelin | Start |
| 7 | 2 | Ovarelin | Week 1 |
| 14 | 3 | Enzaprost | Week 2 |
| 16 | 4 | Ovarelin vakare | Evening dose |
| 17 | 5 | Sėklinti | Insemination |

---

### G7G (Extended Protocol)
**Duration:** 20 days
**Use:** Advanced synchronization

| Day | Step | Medication | Notes |
|-----|------|------------|-------|
| 0 | 1 | Enzaprost | Start |
| 3 | 2 | Ovarelin | |
| 10 | 3 | Ovarelin | |
| 17 | 4 | Enzaprost | |
| 19 | 5 | Ovarelin Vakare | Evening dose |
| 20 | 6 | Sėklinti | Insemination |

---

## ⚠️ Important Notes

### ✅ DO
- Complete steps on schedule when possible
- Record actual dosages used
- Document insemination details
- Enter results after protocol completion

### ❌ DON'T
- Don't start multiple protocols on same animal
- Don't skip steps without canceling
- Don't forget to record insemination
- Don't modify after completion

---

## 🆘 Troubleshooting

### "Protocol button not showing"
- ✅ Make sure Gydymas procedure is checked
- ✅ Scroll down in the visit form

### "Can't start protocol"
- ✅ Check animal doesn't have active protocol
- ✅ Cancel existing protocol first

### "Steps not appearing"
- ✅ Refresh the page
- ✅ Close and reopen animal sidebar

### "Database error"
- ✅ Verify migration was applied
- ✅ Check Supabase is accessible

---

## 📞 Support

### Database Issues
Check that these tables exist in Supabase:
- `synchronization_protocols`
- `animal_synchronizations`
- `synchronization_steps`

### Function Issues
Check that these functions exist:
- `initialize_animal_synchronization`
- `complete_synchronization_step`

### Need Help?
Refer to `SYNCHRONIZATION-SYSTEM-SUMMARY.md` for detailed technical information.

---

## 🎯 Best Practices

### 1. Morning Routine
- Check today's protocol steps (yellow badges)
- Complete them before noon

### 2. Evening Routine
- Check "vakare" (evening) doses
- Complete before end of day

### 3. Weekly Review
- Check upcoming steps for the week
- Ensure medications are in stock

### 4. Protocol Selection
- **Ovsinhr 56:** Use for urgent breeding
- **GGPG:** Standard protocol for most cattle
- **G7G:** Use for difficult-to-breed animals

---

## ✨ Tips for Success

1. **Plan Ahead**: Check protocol timeline before starting
2. **Stock Check**: Verify medications are available
3. **Set Reminders**: Use calendar for upcoming steps
4. **Document Well**: Add notes to steps when needed
5. **Track Results**: Record outcomes for future analysis

---

## 📈 Benefits

### For You:
- ⏰ Never miss a protocol step
- 📊 Visual progress tracking
- 📝 Automatic record keeping
- 💊 Inventory management

### For the Farm:
- 🎯 Consistent breeding procedures
- 📈 Better breeding success rates
- 📊 Historical data analysis
- ✅ Regulatory compliance

---

**Remember:** The system is designed to make your work easier, not harder. If something is confusing, refer to this guide or the detailed summary document.

**Happy Breeding!** 🐄✨
