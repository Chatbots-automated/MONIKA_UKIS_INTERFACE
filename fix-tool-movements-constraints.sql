/*
  # Fix Tool Movements Foreign Key Constraints

  Run this in Supabase SQL Editor to fix the foreign key errors:
  1. Go to https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
  2. Copy and paste this entire file
  3. Click "Run"

  This fixes the error:
  "insert or update on table "tool_movements" violates foreign key constraint"
*/

-- Fix tool_movements_recorded_by_fkey
ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_recorded_by_fkey;

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_recorded_by_fkey
  FOREIGN KEY (recorded_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix tool_movements_to_holder_fkey
ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_to_holder_fkey;

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_to_holder_fkey
  FOREIGN KEY (to_holder)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix tool_movements_from_holder_fkey
ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_from_holder_fkey;

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_from_holder_fkey
  FOREIGN KEY (from_holder)
  REFERENCES users(id)
  ON DELETE SET NULL;
