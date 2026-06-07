-- Add new vehicle fields for better tracking
-- All fields are optional (nullable)

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS identification_number TEXT,
ADD COLUMN IF NOT EXISTS technical_passport_number TEXT,
ADD COLUMN IF NOT EXISTS kasko_insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS kasko_insurance_number TEXT,
ADD COLUMN IF NOT EXISTS civil_insurance_number TEXT,
ADD COLUMN IF NOT EXISTS road_tax_expiry DATE,
ADD COLUMN IF NOT EXISTS tachograph_inspection_due DATE,
ADD COLUMN IF NOT EXISTS license_expiry DATE;

-- Rename insurance_expiry_date to be more specific (civil insurance)
-- We'll keep the old column for backwards compatibility and add a comment
COMMENT ON COLUMN vehicles.insurance_expiry_date IS 'Civil insurance (Civilinis draudimas) expiry date';

-- Add new columns to existing vehicle_documents table for file uploads
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

-- Drop the existing foreign key constraint on uploaded_by if it exists
ALTER TABLE vehicle_documents
DROP CONSTRAINT IF EXISTS vehicle_documents_uploaded_by_fkey;

-- Add uploaded_by column without foreign key constraint to avoid issues
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS uploaded_by UUID;

-- Make document_type nullable since we're now supporting general file uploads
ALTER TABLE vehicle_documents ALTER COLUMN document_type DROP NOT NULL;

-- Create index for faster queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);

-- Enable RLS on vehicle_documents
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete vehicle documents" ON vehicle_documents;

-- RLS policies for vehicle_documents
CREATE POLICY "Users can view vehicle documents"
    ON vehicle_documents FOR SELECT
    USING (true);

CREATE POLICY "Users can insert vehicle documents"
    ON vehicle_documents FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update vehicle documents"
    ON vehicle_documents FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete vehicle documents"
    ON vehicle_documents FOR DELETE
    USING (true);
