/*
  # Fix Milk Weights RLS Policies

  1. Changes
    - Allow anonymous users to insert data (for webhooks)
    - Keep authenticated users able to view/edit all data

  2. Security
    - Webhooks can insert using anon key
    - Authenticated users have full access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all milk weights" ON milk_weights;
DROP POLICY IF EXISTS "Users can insert milk weights" ON milk_weights;
DROP POLICY IF EXISTS "Users can update milk weights" ON milk_weights;
DROP POLICY IF EXISTS "Users can delete milk weights" ON milk_weights;

-- Allow anyone (including anon) to view milk weights
CREATE POLICY "Anyone can view milk weights"
  ON milk_weights FOR SELECT
  USING (true);

-- Allow anyone (including anon) to insert milk weights (for webhooks)
CREATE POLICY "Anyone can insert milk weights"
  ON milk_weights FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update milk weights
CREATE POLICY "Authenticated users can update milk weights"
  ON milk_weights FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete milk weights
CREATE POLICY "Authenticated users can delete milk weights"
  ON milk_weights FOR DELETE
  TO authenticated
  USING (true);
