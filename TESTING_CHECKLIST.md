# Testing Checklist - Technika Kiemas Enhancement

## Pre-Testing Setup

- [ ] SQL migration applied successfully
  - File: `supabase/migrations/20260408000001_enhance_technika_assignments.sql`
  - No errors during application
  - All views created
  - All indexes created

- [ ] Development server restarted
  - Frontend recompiled
  - No TypeScript errors
  - No console errors on page load

- [ ] Database connection working
  - Can query vehicles table
  - Can query users table
  - Can query equipment_invoice_item_assignments table

---

## 1. Vehicle Category Testing

### Create New Tractor
- [ ] Navigate to Transportas tab
- [ ] Click "Pridėti transportą" (Add Transport)
- [ ] Fill in basic info:
  - [ ] Registration number (e.g., "ABC123")
  - [ ] Select "Tipas" → "Traktorius"
  - [ ] Verify "Kategorija" auto-populates to "Traktorius"
  - [ ] Fill in Make (e.g., "John Deere")
  - [ ] Fill in Model (e.g., "6120M")
- [ ] Click "Sukurti" (Create)
- [ ] Verify success message
- [ ] Verify vehicle appears in list with tractor icon/label

### Create New Heavy Transport
- [ ] Click "Pridėti transportą"
- [ ] Fill in basic info:
  - [ ] Registration number (e.g., "XYZ789")
  - [ ] Select "Tipas" → "Sunkvežimis"
  - [ ] Verify "Kategorija" auto-populates to "Sunkvežimis - Heavy Transport"
  - [ ] Fill in Make (e.g., "Volvo")
  - [ ] Fill in Model (e.g., "FH16")
- [ ] Click "Sukurti"
- [ ] Verify success message
- [ ] Verify vehicle appears in list

### Edit Existing Vehicle
- [ ] Click edit button on any vehicle
- [ ] Change "Kategorija" dropdown
- [ ] Click "Išsaugoti" (Save)
- [ ] Verify category updated in database:
  ```sql
  SELECT registration_number, vehicle_category FROM vehicles WHERE id = 'vehicle-id';
  ```

### Database Verification
- [ ] Run query to check categories:
  ```sql
  SELECT registration_number, vehicle_type, vehicle_category 
  FROM vehicles 
  WHERE is_active = true 
  ORDER BY registration_number;
  ```
- [ ] Verify tractors have `vehicle_category = 'tractor'`
- [ ] Verify trucks have `vehicle_category = 'heavy_transport'`

---

## 2. Worker Assignment Testing

### Prepare Test Data
- [ ] Have at least 2 active workers in system
- [ ] Verify workers not frozen:
  ```sql
  SELECT id, full_name, email, is_frozen FROM users WHERE is_frozen = false;
  ```

### Upload Invoice
- [ ] Navigate to Sąskaitos tab
- [ ] Click upload button
- [ ] Select a test PDF invoice
- [ ] Wait for parsing to complete
- [ ] Verify products matched or create new products
- [ ] Click "Patvirtinti sąskaitą" (Confirm Invoice)
- [ ] **Verify Assignment Modal Opens**

### Test Worker Assignment UI
- [ ] Verify modal shows "Priskirti produktus" title
- [ ] Verify blue section at top: "Priskirti darbuotojui arba transportui"
- [ ] Verify two buttons visible:
  - [ ] "Darbuotojui" (green)
  - [ ] "Transportui" (purple)

### Assign to Worker
- [ ] Click "Darbuotojui" button
- [ ] Verify button highlights (green background)
- [ ] Verify worker dropdown appears
- [ ] Verify dropdown shows all active workers
- [ ] Verify format: "Full Name (email@example.com)"
- [ ] Select a worker from dropdown
- [ ] Add notes: "Test worker assignment - Safety boots"
- [ ] Click "Priskirti" (Assign)
- [ ] Verify success message
- [ ] Verify modal shows next product (if multiple) or closes

### Database Verification - Worker Assignment
- [ ] Query worker assignments:
  ```sql
  SELECT * FROM worker_equipment_assignments 
  WHERE worker_id = 'selected-worker-id'
  ORDER BY assigned_at DESC 
  LIMIT 1;
  ```
- [ ] Verify assignment record exists
- [ ] Verify correct worker_id
- [ ] Verify correct product information
- [ ] Verify notes saved correctly
- [ ] Verify assignment_type = 'worker'

### Test Worker Assignment Summary
- [ ] Query summary:
  ```sql
  SELECT * FROM worker_assignment_summary 
  WHERE worker_id = 'selected-worker-id';
  ```
- [ ] Verify total_assignments increased
- [ ] Verify total_cost updated
- [ ] Verify last_assignment_date is recent

---

## 3. Vehicle Assignment Testing

### Upload Another Invoice
- [ ] Upload new test invoice
- [ ] Match products
- [ ] Confirm invoice
- [ ] Wait for assignment modal

### Test Vehicle Assignment UI
- [ ] Click "Transportui" button
- [ ] Verify button highlights (purple background)
- [ ] Verify vehicle sections appear:
  - [ ] "Traktoriai" section visible
  - [ ] "Sunkvežimiai" section visible
  - [ ] "Kiti transportai" section (if applicable)

### Verify Vehicle Categorization
- [ ] In "Traktoriai" section:
  - [ ] Verify only tractors listed
  - [ ] Verify format: "REG123 - Make Model"
  - [ ] Verify dropdown functional
- [ ] In "Sunkvežimiai" section:
  - [ ] Verify only heavy transport listed
  - [ ] Verify format: "REG456 - Make Model"
  - [ ] Verify dropdown functional

### Assign to Tractor
- [ ] In "Traktoriai" section, select a tractor
- [ ] Add notes: "Test tractor assignment - Oil filter"
- [ ] Click "Priskirti"
- [ ] Verify success message

### Assign to Heavy Transport
- [ ] Upload another invoice (or use next product)
- [ ] Click "Transportui"
- [ ] In "Sunkvežimiai" section, select a truck
- [ ] Add notes: "Test truck assignment - Brake pads"
- [ ] Click "Priskirti"
- [ ] Verify success message

### Database Verification - Vehicle Assignments
- [ ] Query tractor assignment:
  ```sql
  SELECT * FROM vehicle_equipment_assignments 
  WHERE vehicle_id = 'tractor-id' 
  ORDER BY assigned_at DESC 
  LIMIT 1;
  ```
- [ ] Verify assignment_type = 'vehicle'
- [ ] Verify correct vehicle_id
- [ ] Verify vehicle_category = 'tractor'
- [ ] Verify product information correct
- [ ] Verify notes saved

- [ ] Query truck assignment:
  ```sql
  SELECT * FROM vehicle_equipment_assignments 
  WHERE vehicle_id = 'truck-id' 
  ORDER BY assigned_at DESC 
  LIMIT 1;
  ```
- [ ] Verify vehicle_category = 'heavy_transport'

### Test Vehicle Assignment Summary
- [ ] Query tractor summary:
  ```sql
  SELECT * FROM vehicle_assignment_summary 
  WHERE vehicle_id = 'tractor-id';
  ```
- [ ] Verify statistics updated

- [ ] Query truck summary:
  ```sql
  SELECT * FROM vehicle_assignment_summary 
  WHERE vehicle_id = 'truck-id';
  ```
- [ ] Verify statistics updated

### Test Category Filtering Function
- [ ] Get all tractors:
  ```sql
  SELECT * FROM get_vehicles_by_category('tractor');
  ```
- [ ] Verify only tractors returned

- [ ] Get all heavy transport:
  ```sql
  SELECT * FROM get_vehicles_by_category('heavy_transport');
  ```
- [ ] Verify only heavy transport returned

- [ ] Get all vehicles:
  ```sql
  SELECT * FROM get_vehicles_by_category(NULL);
  ```
- [ ] Verify all vehicles returned

---

## 4. Other Assignment Types (Regression Testing)

### Test Tool Assignment
- [ ] Upload invoice
- [ ] In assignment modal, click "Įrankiui/Įrangai"
- [ ] Select a tool
- [ ] Assign successfully
- [ ] Verify in database

### Test Building Assignment
- [ ] Upload invoice
- [ ] Click "Pastatui"
- [ ] Assign successfully
- [ ] Verify in database

### Test Cost Center Assignment
- [ ] Upload invoice
- [ ] Select a cost center
- [ ] Assign successfully
- [ ] Verify in database

### Test General Farm Assignment
- [ ] Upload invoice
- [ ] Click "Bendrai fermai"
- [ ] Assign successfully
- [ ] Verify in database

---

## 5. Edge Cases & Error Handling

### Empty States
- [ ] Test assignment modal with no workers
  - [ ] Verify graceful handling
  - [ ] Verify appropriate message or empty dropdown

- [ ] Test assignment modal with no vehicles
  - [ ] Verify graceful handling
  - [ ] Verify sections don't appear if empty

- [ ] Test with vehicles but no categorized vehicles
  - [ ] Verify "Kiti transportai" section appears
  - [ ] Verify vehicles listed correctly

### Validation
- [ ] Try to assign to worker without selecting worker
  - [ ] Verify error message: "Prašome pasirinkti darbuotoją"

- [ ] Try to assign to vehicle without selecting vehicle
  - [ ] Verify error message: "Prašome pasirinkti transporto priemonę"

- [ ] Try to skip assignment
  - [ ] Click "Praleisti šį produktą"
  - [ ] Verify product skipped
  - [ ] Verify appears in unassigned items view

### Multiple Products
- [ ] Upload invoice with 3+ products
- [ ] Assign first to worker
- [ ] Assign second to tractor
- [ ] Assign third to truck
- [ ] Skip fourth
- [ ] Verify all assignments saved correctly

---

## 6. Unassigned Items Testing

### View Unassigned Items
- [ ] Query unassigned items:
  ```sql
  SELECT * FROM equipment_unassigned_invoice_items 
  ORDER BY invoice_date DESC;
  ```
- [ ] Verify skipped items appear
- [ ] Verify assigned items don't appear

---

## 7. Performance Testing

### Large Dataset
- [ ] Test with 50+ workers
  - [ ] Verify dropdown loads quickly
  - [ ] Verify search/filter works (if implemented)

- [ ] Test with 50+ vehicles
  - [ ] Verify sections load quickly
  - [ ] Verify categorization correct

### Multiple Assignments
- [ ] Create 20+ assignments
- [ ] Query views:
  ```sql
  SELECT * FROM worker_equipment_assignments;
  SELECT * FROM vehicle_equipment_assignments;
  ```
- [ ] Verify queries execute quickly (< 1 second)
- [ ] Verify indexes being used

---

## 8. UI/UX Testing

### Visual Appearance
- [ ] Assignment modal displays correctly
- [ ] Buttons have correct colors (green for worker, purple for vehicle)
- [ ] Sections are clearly separated
- [ ] Dropdowns are readable
- [ ] Notes textarea is functional

### Responsiveness
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (if applicable)
- [ ] Verify modal scrolls if content too long

### User Flow
- [ ] Flow feels natural
- [ ] No confusion about where to click
- [ ] Success messages clear
- [ ] Error messages helpful

---

## 9. Browser Compatibility

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Edge
- [ ] Test in Safari (if available)

---

## 10. Data Integrity

### Foreign Key Constraints
- [ ] Try to delete a worker with assignments
  - [ ] Verify constraint prevents deletion or handles gracefully

- [ ] Try to delete a vehicle with assignments
  - [ ] Verify constraint prevents deletion or handles gracefully

### Data Consistency
- [ ] Query all assignments:
  ```sql
  SELECT 
    assignment_type,
    COUNT(*) as count,
    SUM(CASE WHEN worker_id IS NOT NULL THEN 1 ELSE 0 END) as with_worker,
    SUM(CASE WHEN vehicle_id IS NOT NULL THEN 1 ELSE 0 END) as with_vehicle
  FROM equipment_invoice_item_assignments
  GROUP BY assignment_type;
  ```
- [ ] Verify:
  - [ ] 'worker' type has worker_id
  - [ ] 'vehicle' type has vehicle_id
  - [ ] No orphaned assignments

---

## 11. Reporting & Analytics

### Worker Reports
- [ ] Generate report of all worker assignments
- [ ] Verify totals match individual assignments
- [ ] Export data (if feature exists)

### Vehicle Reports
- [ ] Generate report by vehicle category
- [ ] Compare tractor costs vs heavy transport costs
- [ ] Verify calculations correct

### Cost Analysis
- [ ] Calculate total cost per worker
- [ ] Calculate total cost per vehicle
- [ ] Calculate total cost per category
- [ ] Verify numbers make sense

---

## 12. Documentation Verification

- [ ] README files accurate
- [ ] SQL comments helpful
- [ ] Code comments clear
- [ ] No outdated information

---

## Final Checklist

- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] User experience smooth
- [ ] Data integrity maintained
- [ ] Documentation complete
- [ ] Ready for production use

---

## Notes Section

Use this space to record any issues found during testing:

### Issues Found:
1. 
2. 
3. 

### Improvements Needed:
1. 
2. 
3. 

### Questions:
1. 
2. 
3. 

---

## Sign-Off

- [ ] Testing completed by: ________________
- [ ] Date: ________________
- [ ] All critical tests passed: Yes / No
- [ ] Ready for production: Yes / No

---

**Remember**: This is a comprehensive checklist. Not all items may apply to your specific use case. Focus on the critical path first (vehicle categories, worker assignments, vehicle assignments) and then test edge cases.
