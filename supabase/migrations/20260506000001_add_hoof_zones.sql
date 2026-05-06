-- Add zone field to hoof_records table to track specific hoof zones (0-10)
-- Zone mapping based on veterinary hoof chart:
-- Zone 0: Center sole
-- Zones 1-10: Various anatomical regions of the hoof

ALTER TABLE public.hoof_records 
ADD COLUMN IF NOT EXISTS zone INTEGER;

-- Add constraint only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hoof_records_zone_check' 
    AND conrelid = 'public.hoof_records'::regclass
  ) THEN
    ALTER TABLE public.hoof_records 
    ADD CONSTRAINT hoof_records_zone_check 
    CHECK (zone IS NULL OR (zone >= 0 AND zone <= 10));
  END IF;
END $$;

COMMENT ON COLUMN public.hoof_records.zone IS 
'Hoof zone number (0-10) following standard veterinary hoof chart. NULL for general examinations.';

-- Create or update hoof_condition_codes if needed
CREATE TABLE IF NOT EXISTS public.hoof_condition_codes (
  code TEXT PRIMARY KEY,
  name_lt TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  severity_default INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add severity_default column if it doesn't exist (for existing tables)
ALTER TABLE public.hoof_condition_codes 
ADD COLUMN IF NOT EXISTS severity_default INTEGER DEFAULT 0;

-- Add name_en column if it doesn't exist (for existing tables)
ALTER TABLE public.hoof_condition_codes 
ADD COLUMN IF NOT EXISTS name_en TEXT;

-- Add description column if it doesn't exist (for existing tables)
ALTER TABLE public.hoof_condition_codes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Insert common hoof lesion types if they don't exist
INSERT INTO public.hoof_condition_codes (code, name_lt, name_en, description, severity_default) 
VALUES 
  ('OK', 'Sveikas', 'Healthy', 'Jokių pažeidimų', 0),
  ('WLD', 'Baltosios linijos liga', 'White Line Disease', 'Soft inner/outer', 2),
  ('AF', 'Ašinė fisūra', 'Axial Fissure', 'Plyšys ašinėje dalyje', 2),
  ('ID', 'Tarppiršlio dermatitas', 'Interdigital Dermatitis', 'Uždegimas tarp nagų', 2),
  ('HF', 'Horizontali fisūra', 'Horizontal Fissure', 'Horizontalus plyšys', 1),
  ('TU', 'Kolelateralinė žaizda', 'Toe Ulcer', 'Žaizda nago gale', 3),
  ('VF', 'Vertikali fisūra', 'Vertical Fissure', 'Vertikalus plyšys', 2),
  ('IP', 'Tarppiršlio flegmona', 'Interdigital Phlegmon', 'Abscessas tarp nagų', 4),
  ('DD', 'Skaitmeninis dermatitas', 'Digital Dermatitis', 'Papillomatous digital dermatitis', 3),
  ('SU', 'Padės opinis', 'Sole Ulcer', 'Opinis padėje', 3),
  ('HE', 'Kulno erozija', 'Heel Erosion', 'Kulno pažeidimas', 2)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hoof_condition_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hoof_records TO authenticated;

-- Update existing views if needed
COMMENT ON TABLE public.hoof_records IS 
'Main table tracking all hoof examinations, conditions, and treatments per animal. 
Now includes zone field (0-10) for precise location tracking.';
