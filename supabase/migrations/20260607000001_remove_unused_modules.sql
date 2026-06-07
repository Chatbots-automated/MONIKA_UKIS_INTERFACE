-- Migration to remove Technika, Pienas, Buhalterija and Worker modules
-- Created: 2026-06-07
-- Removes all tables and views associated with removed modules

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS milk_data_combined CASCADE;
DROP VIEW IF EXISTS equipment_warehouse_stock CASCADE;
DROP VIEW IF EXISTS equipment_unassigned_invoice_items CASCADE;
DROP VIEW IF EXISTS equipment_items_on_loan CASCADE;
DROP VIEW IF EXISTS cost_center_parts_usage CASCADE;
DROP VIEW IF EXISTS cost_center_summary_with_children CASCADE;
DROP VIEW IF EXISTS cost_center_summary CASCADE;
DROP VIEW IF EXISTS cost_center_direct_summary CASCADE;
DROP VIEW IF EXISTS farm_equipment_cost_overview CASCADE;
DROP VIEW IF EXISTS farm_equipment_items_detail CASCADE;
DROP VIEW IF EXISTS farm_equipment_service_cost_summary CASCADE;
DROP VIEW IF EXISTS farm_equipment_service_details CASCADE;
DROP VIEW IF EXISTS farm_equipment_summary CASCADE;
DROP VIEW IF EXISTS gea_daily_cows_joined CASCADE;
DROP VIEW IF EXISTS worker_time_entries_detail CASCADE;
DROP VIEW IF EXISTS worker_task_reports_detail CASCADE;

-- Drop Worker-related tables (from removed admin sections)
DROP TABLE IF EXISTS worker_login_codes CASCADE;
DROP TABLE IF EXISTS worker_food_preferences CASCADE;
DROP TABLE IF EXISTS admin_food_counts CASCADE;
DROP TABLE IF EXISTS food_list_shared_with_workers CASCADE;
DROP TABLE IF EXISTS worker_time_entries CASCADE;
DROP TABLE IF EXISTS worker_task_reports CASCADE;
DROP TABLE IF EXISTS day_type_initials CASCADE;
DROP TABLE IF EXISTS manual_time_entries CASCADE;
DROP TABLE IF EXISTS work_descriptions CASCADE;

-- Drop Milk/Pienas tables
DROP TABLE IF EXISTS milk_test_summaries CASCADE;
DROP TABLE IF EXISTS milk_tests CASCADE;
DROP TABLE IF EXISTS milk_scrape_sessions CASCADE;
DROP TABLE IF EXISTS milk_production CASCADE;
DROP TABLE IF EXISTS milk_composition_tests CASCADE;
DROP TABLE IF EXISTS milk_quality_tests CASCADE;
DROP TABLE IF EXISTS milk_weights CASCADE;
DROP TABLE IF EXISTS milk_producers CASCADE;

-- Drop GEA tables
DROP TABLE IF EXISTS gea_daily_ataskaita1 CASCADE;
DROP TABLE IF EXISTS gea_daily_ataskaita2 CASCADE;
DROP TABLE IF EXISTS gea_daily_ataskaita3 CASCADE;
DROP TABLE IF EXISTS gea_daily_imports CASCADE;

-- Drop Equipment/Technika tables
DROP TABLE IF EXISTS equipment_stock_movements CASCADE;
DROP TABLE IF EXISTS equipment_issuance_items CASCADE;
DROP TABLE IF EXISTS equipment_issuances CASCADE;
DROP TABLE IF EXISTS equipment_invoice_item_assignments CASCADE;
DROP TABLE IF EXISTS equipment_invoice_items CASCADE;
DROP TABLE IF EXISTS equipment_invoices CASCADE;
DROP TABLE IF EXISTS equipment_batches CASCADE;
DROP TABLE IF EXISTS equipment_products CASCADE;
DROP TABLE IF EXISTS equipment_categories CASCADE;
DROP TABLE IF EXISTS equipment_locations CASCADE;
DROP TABLE IF EXISTS equipment_suppliers CASCADE;

-- Drop Farm Equipment tables
DROP TABLE IF EXISTS farm_equipment_service_parts CASCADE;
DROP TABLE IF EXISTS farm_equipment_service_records CASCADE;
DROP TABLE IF EXISTS farm_equipment_items CASCADE;
DROP TABLE IF EXISTS farm_equipment CASCADE;

-- Drop Vehicles and Maintenance tables
DROP TABLE IF EXISTS work_order_parts CASCADE;
DROP TABLE IF EXISTS maintenance_work_orders CASCADE;
DROP TABLE IF EXISTS maintenance_schedules CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- Drop PPE and Fire Safety tables
DROP TABLE IF EXISTS ppe_issuance_records CASCADE;
DROP TABLE IF EXISTS ppe_items CASCADE;
DROP TABLE IF EXISTS fire_extinguishers CASCADE;

-- Drop Worker Schedule tables
DROP TABLE IF EXISTS worker_schedules CASCADE;

-- Drop Cost Center tables
DROP TABLE IF EXISTS cost_accumulation_items CASCADE;
DROP TABLE IF EXISTS cost_accumulation_documents CASCADE;
DROP TABLE IF EXISTS cost_accumulation_projects CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;

-- Note: We keep invoices and invoice_items as they are used by veterinary module
-- Note: We keep batches, products, suppliers as they are used by veterinary module

COMMENT ON SCHEMA public IS 'Veterinary management system - Živatkauskų ūkis. Technika, Pienas, and Worker modules removed on 2026-06-07';
