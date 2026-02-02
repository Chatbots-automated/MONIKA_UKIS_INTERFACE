/*
  # Create Vehicle Service Visits System

  1. New Tables
    - `vehicle_service_visits` - Main table for tracking vehicle service visits
    - `vehicle_visit_parts` - Junction table linking service visits to parts used
    - `vehicle_documents` - Store vehicle-related documents

  2. Modifications
    - Update `maintenance_work_orders` to add `service_visit_id` foreign key
    - Update `vehicles` to add `last_service_date` and related columns

  3. Views
    - `vehicle_service_history` - aggregated view of all services per vehicle

  4. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Create vehicle_service_visits table
CREATE TABLE IF NOT EXISTS vehicle_service_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  visit_datetime timestamptz NOT NULL,
  visit_type text NOT NULL DEFAULT 'planinis',
  procedures text[] DEFAULT ARRAY[]::text[],
  odometer_reading numeric(10,2),
  engine_hours numeric(10,2),
  status text NOT NULL DEFAULT 'Planuojamas',
  notes text,
  mechanic_name text,
  next_visit_required boolean DEFAULT false,
  next_visit_date timestamptz,
  cost_estimate numeric(10,2),
  actual_cost numeric(10,2),
  labor_hours numeric(10,2),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  CONSTRAINT valid_visit_type CHECK (visit_type IN ('planinis', 'neplaninis')),
  CONSTRAINT valid_status CHECK (status IN ('Planuojamas', 'Vykdomas', 'Baigtas', 'Atsauktas'))
);

-- Create vehicle_visit_parts table
CREATE TABLE IF NOT EXISTS vehicle_visit_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES vehicle_service_visits(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  batch_id uuid REFERENCES batches(id),
  quantity_used numeric(10,3) NOT NULL,
  cost_per_unit numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other',
  document_name text NOT NULL,
  file_url text,
  issue_date date,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  CONSTRAINT valid_document_type CHECK (document_type IN ('insurance', 'technical_inspection', 'service_record', 'manual', 'other'))
);

-- Add columns to maintenance_work_orders if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_work_orders' AND column_name = 'service_visit_id'
  ) THEN
    ALTER TABLE maintenance_work_orders ADD COLUMN service_visit_id uuid REFERENCES vehicle_service_visits(id);
  END IF;
END $$;

-- Add columns to vehicles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'last_service_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN last_service_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'last_service_mileage'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN last_service_mileage numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'last_service_hours'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN last_service_hours numeric(10,2);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_service_visits_vehicle_id ON vehicle_service_visits(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_service_visits_datetime ON vehicle_service_visits(visit_datetime);
CREATE INDEX IF NOT EXISTS idx_vehicle_service_visits_status ON vehicle_service_visits(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_visit_parts_visit_id ON vehicle_visit_parts(visit_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry_date ON vehicle_documents(expiry_date);

-- Create view for vehicle service history
CREATE OR REPLACE VIEW vehicle_service_history AS
SELECT
  v.id as vehicle_id,
  v.registration_number,
  v.make,
  v.model,
  COUNT(DISTINCT vsv.id) FILTER (WHERE vsv.status = 'Baigtas') as total_services,
  COUNT(DISTINCT mwo.id) FILTER (WHERE mwo.status = 'completed') as total_work_orders,
  SUM(vsv.actual_cost) as total_service_cost,
  SUM(mwo.actual_cost) as total_work_order_cost,
  MAX(vsv.visit_datetime) FILTER (WHERE vsv.status = 'Baigtas') as last_service_date,
  SUM(vsv.labor_hours) as total_labor_hours
FROM vehicles v
LEFT JOIN vehicle_service_visits vsv ON v.id = vsv.vehicle_id
LEFT JOIN maintenance_work_orders mwo ON v.id = mwo.vehicle_id
GROUP BY v.id, v.registration_number, v.make, v.model;

-- Enable RLS
ALTER TABLE vehicle_service_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_visit_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_service_visits
CREATE POLICY "Users can view service visits for their vehicles"
  ON vehicle_service_visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_service_visits.vehicle_id
    )
  );

CREATE POLICY "Users can create service visits"
  ON vehicle_service_visits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_service_visits.vehicle_id
    )
  );

CREATE POLICY "Users can update service visits"
  ON vehicle_service_visits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_service_visits.vehicle_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_service_visits.vehicle_id
    )
  );

CREATE POLICY "Users can delete service visits"
  ON vehicle_service_visits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_service_visits.vehicle_id
    )
  );

-- RLS Policies for vehicle_visit_parts
CREATE POLICY "Users can view visit parts"
  ON vehicle_visit_parts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_service_visits vsv
      JOIN vehicles v ON v.id = vsv.vehicle_id
      WHERE vsv.id = vehicle_visit_parts.visit_id
    )
  );

CREATE POLICY "Users can create visit parts"
  ON vehicle_visit_parts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicle_service_visits vsv
      JOIN vehicles v ON v.id = vsv.vehicle_id
      WHERE vsv.id = vehicle_visit_parts.visit_id
    )
  );

CREATE POLICY "Users can update visit parts"
  ON vehicle_visit_parts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_service_visits vsv
      JOIN vehicles v ON v.id = vsv.vehicle_id
      WHERE vsv.id = vehicle_visit_parts.visit_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicle_service_visits vsv
      JOIN vehicles v ON v.id = vsv.vehicle_id
      WHERE vsv.id = vehicle_visit_parts.visit_id
    )
  );

CREATE POLICY "Users can delete visit parts"
  ON vehicle_visit_parts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_service_visits vsv
      JOIN vehicles v ON v.id = vsv.vehicle_id
      WHERE vsv.id = vehicle_visit_parts.visit_id
    )
  );

-- RLS Policies for vehicle_documents
CREATE POLICY "Users can view vehicle documents"
  ON vehicle_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_documents.vehicle_id
    )
  );

CREATE POLICY "Users can create vehicle documents"
  ON vehicle_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_documents.vehicle_id
    )
  );

CREATE POLICY "Users can update vehicle documents"
  ON vehicle_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_documents.vehicle_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_documents.vehicle_id
    )
  );

CREATE POLICY "Users can delete vehicle documents"
  ON vehicle_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_documents.vehicle_id
    )
  );

-- Create trigger to update vehicle last_service_date when a service is completed
CREATE OR REPLACE FUNCTION update_vehicle_last_service()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Baigtas' AND (OLD.status IS NULL OR OLD.status != 'Baigtas') THEN
    UPDATE vehicles
    SET
      last_service_date = NEW.visit_datetime,
      last_service_mileage = COALESCE(NEW.odometer_reading, last_service_mileage),
      last_service_hours = COALESCE(NEW.engine_hours, last_service_hours)
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_last_service
  AFTER INSERT OR UPDATE ON vehicle_service_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_last_service();
