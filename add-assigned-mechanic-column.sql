/*
  # Add assigned_mechanic column to maintenance_work_orders

  1. Changes
    - Add `assigned_mechanic` text column to `maintenance_work_orders` table
    - This allows free-text mechanic names in addition to the existing `assigned_to` UUID field

  2. Notes
    - The `assigned_to` field references users table (for system users)
    - The `assigned_mechanic` field is for external mechanics or free-text names
    - Both fields are optional and can coexist
*/

-- Add assigned_mechanic column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_work_orders' AND column_name = 'assigned_mechanic'
  ) THEN
    ALTER TABLE maintenance_work_orders ADD COLUMN assigned_mechanic text;
  END IF;
END $$;
