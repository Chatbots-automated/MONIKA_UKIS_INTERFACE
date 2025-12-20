/*
  # Milk Production and Testing Module

  Creates comprehensive milk tracking system with:
  1. Real-time milk production data from scales
  2. Lab test results (pieno tyrimai)
  3. Combined analytics view

  ## New Tables

  ### `milk_production`
  Records individual milking sessions from connected scales
  - `id` (uuid, primary key)
  - `animal_id` (uuid, foreign key to animals)
  - `measurement_date` (date) - date of milking
  - `measurement_time` (time) - time of milking
  - `milk_quantity` (decimal) - amount in kg or liters
  - `milk_temperature` (decimal) - temperature in celsius
  - `session_type` (text) - morning, afternoon, evening
  - `milking_duration` (integer) - duration in seconds
  - `flow_rate` (decimal) - avg flow rate
  - `conductivity` (decimal) - electrical conductivity (mastitis indicator)
  - `scale_device_id` (text) - identifier of the scale that sent data
  - `notes` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### `milk_tests`
  Lab analysis results for milk quality
  - `id` (uuid, primary key)
  - `animal_id` (uuid, foreign key to animals)
  - `test_date` (date) - when test was performed
  - `sample_date` (date) - when sample was collected
  - `sample_session` (text) - which milking session
  - `fat_percentage` (decimal) - fat %
  - `protein_percentage` (decimal) - protein %
  - `lactose_percentage` (decimal) - lactose %
  - `somatic_cell_count` (integer) - SCC (cells/ml) - mastitis indicator
  - `bacteria_count` (integer) - total bacterial count
  - `urea_level` (decimal) - urea mg/dl
  - `ph_level` (decimal) - pH value
  - `freezing_point` (decimal) - freezing point in celsius
  - `total_solids` (decimal) - total solids %
  - `test_status` (text) - pending, completed, requires_attention
  - `lab_name` (text) - testing laboratory
  - `lab_reference` (text) - lab reference number
  - `notes` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### `vw_milk_analytics`
  Combined view of production and test data

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read all milk records
  - Only authenticated users can insert/update/delete
*/

-- Create milk_production table
CREATE TABLE IF NOT EXISTS milk_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  measurement_time time NOT NULL DEFAULT CURRENT_TIME,
  milk_quantity decimal(10,2) NOT NULL CHECK (milk_quantity >= 0),
  milk_temperature decimal(5,2),
  session_type text DEFAULT 'morning' CHECK (session_type IN ('morning', 'afternoon', 'evening', 'other')),
  milking_duration integer CHECK (milking_duration >= 0),
  flow_rate decimal(10,2),
  conductivity decimal(10,2),
  scale_device_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_milk_production_animal ON milk_production(animal_id);
CREATE INDEX IF NOT EXISTS idx_milk_production_date ON milk_production(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_milk_production_animal_date ON milk_production(animal_id, measurement_date DESC);

-- Enable RLS
ALTER TABLE milk_production ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milk_production
CREATE POLICY "Authenticated users can view all milk production records"
  ON milk_production FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert milk production records"
  ON milk_production FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update milk production records"
  ON milk_production FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete milk production records"
  ON milk_production FOR DELETE
  TO authenticated
  USING (true);

-- Create milk_tests table
CREATE TABLE IF NOT EXISTS milk_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  test_date date NOT NULL DEFAULT CURRENT_DATE,
  sample_date date NOT NULL,
  sample_session text CHECK (sample_session IN ('morning', 'afternoon', 'evening', 'composite', 'other')),
  fat_percentage decimal(5,2) CHECK (fat_percentage >= 0 AND fat_percentage <= 100),
  protein_percentage decimal(5,2) CHECK (protein_percentage >= 0 AND protein_percentage <= 100),
  lactose_percentage decimal(5,2) CHECK (lactose_percentage >= 0 AND lactose_percentage <= 100),
  somatic_cell_count integer CHECK (somatic_cell_count >= 0),
  bacteria_count integer CHECK (bacteria_count >= 0),
  urea_level decimal(10,2),
  ph_level decimal(4,2) CHECK (ph_level >= 0 AND ph_level <= 14),
  freezing_point decimal(5,3),
  total_solids decimal(5,2) CHECK (total_solids >= 0 AND total_solids <= 100),
  test_status text DEFAULT 'pending' CHECK (test_status IN ('pending', 'completed', 'requires_attention')),
  lab_name text,
  lab_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_milk_tests_animal ON milk_tests(animal_id);
CREATE INDEX IF NOT EXISTS idx_milk_tests_date ON milk_tests(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_milk_tests_sample_date ON milk_tests(sample_date DESC);
CREATE INDEX IF NOT EXISTS idx_milk_tests_status ON milk_tests(test_status);

-- Enable RLS
ALTER TABLE milk_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milk_tests
CREATE POLICY "Authenticated users can view all milk test records"
  ON milk_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert milk test records"
  ON milk_tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update milk test records"
  ON milk_tests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete milk test records"
  ON milk_tests FOR DELETE
  TO authenticated
  USING (true);

-- Create analytics view
CREATE OR REPLACE VIEW vw_milk_analytics AS
SELECT
  a.id as animal_id,
  a.tag_no,
  a.species,
  a.holder_name,

  -- Latest test results
  (SELECT mt.test_date
   FROM milk_tests mt
   WHERE mt.animal_id = a.id
   ORDER BY mt.test_date DESC
   LIMIT 1) as latest_test_date,

  (SELECT mt.fat_percentage
   FROM milk_tests mt
   WHERE mt.animal_id = a.id
   ORDER BY mt.test_date DESC
   LIMIT 1) as latest_fat_pct,

  (SELECT mt.protein_percentage
   FROM milk_tests mt
   WHERE mt.animal_id = a.id
   ORDER BY mt.test_date DESC
   LIMIT 1) as latest_protein_pct,

  (SELECT mt.somatic_cell_count
   FROM milk_tests mt
   WHERE mt.animal_id = a.id
   ORDER BY mt.test_date DESC
   LIMIT 1) as latest_scc,

  (SELECT mt.test_status
   FROM milk_tests mt
   WHERE mt.animal_id = a.id
   ORDER BY mt.test_date DESC
   LIMIT 1) as latest_test_status,

  -- Production summary (last 7 days)
  (SELECT COUNT(*)
   FROM milk_production mp
   WHERE mp.animal_id = a.id
   AND mp.measurement_date >= CURRENT_DATE - INTERVAL '7 days') as milkings_last_7_days,

  (SELECT COALESCE(SUM(mp.milk_quantity), 0)
   FROM milk_production mp
   WHERE mp.animal_id = a.id
   AND mp.measurement_date >= CURRENT_DATE - INTERVAL '7 days') as total_milk_7_days,

  (SELECT COALESCE(AVG(mp.milk_quantity), 0)
   FROM milk_production mp
   WHERE mp.animal_id = a.id
   AND mp.measurement_date >= CURRENT_DATE - INTERVAL '7 days') as avg_milk_per_session,

  -- Today's production
  (SELECT COALESCE(SUM(mp.milk_quantity), 0)
   FROM milk_production mp
   WHERE mp.animal_id = a.id
   AND mp.measurement_date = CURRENT_DATE) as milk_today,

  -- Latest milking
  (SELECT mp.measurement_time
   FROM milk_production mp
   WHERE mp.animal_id = a.id
   ORDER BY mp.measurement_date DESC, mp.measurement_time DESC
   LIMIT 1) as latest_milking_time

FROM animals a
WHERE a.species ILIKE '%karv%' OR a.species ILIKE '%cow%'
ORDER BY a.tag_no;

-- Enable realtime for milk_production (for scale data)
ALTER PUBLICATION supabase_realtime ADD TABLE milk_production;

-- Enable realtime for milk_tests
ALTER PUBLICATION supabase_realtime ADD TABLE milk_tests;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_milk_production_updated_at BEFORE UPDATE ON milk_production
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milk_tests_updated_at BEFORE UPDATE ON milk_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
