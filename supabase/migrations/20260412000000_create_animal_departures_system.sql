-- Create system for tracking departed animals (išvežti gyvūnai)
-- This system tracks animals that have been sent away and checks for withdrawal period conflicts

-- Table to store departed animals
CREATE TABLE IF NOT EXISTS public.animal_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID REFERENCES public.animals(id) ON DELETE CASCADE,
  animal_number TEXT NOT NULL, -- LT000008370444 format
  departure_date DATE NOT NULL, -- Data field from Excel (when sent away)
  gender TEXT, -- Lytis: Karvė, Bulius, etc.
  birth_date TEXT, -- Gimimo data
  reason TEXT, -- Priežastis
  vet_reason_code TEXT, -- Vet. priež. Nr.
  destination_name TEXT, -- Vardas, pavardė/pavadinimas (where sent to)
  destination_herd_number TEXT, -- Bandos numeris (destination)
  source_name TEXT, -- Vardas, pavardė / pavadinimas (from)
  source_herd_number TEXT, -- Bandos numeris (from)
  entered_by TEXT, -- Įvedėjas
  
  -- Calculated fields
  last_treatment_date DATE, -- Last treatment registration date
  last_withdrawal_milk DATE, -- Last milk withdrawal date from treatments
  last_withdrawal_meat DATE, -- Last meat withdrawal date from treatments
  has_withdrawal_conflict BOOLEAN DEFAULT false, -- True if departure_date < withdrawal dates
  conflict_details TEXT, -- Description of conflict if any
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't duplicate the same animal + departure date
  UNIQUE(animal_number, departure_date)
);

-- Indexes for performance
CREATE INDEX idx_animal_departures_animal_id ON public.animal_departures(animal_id);
CREATE INDEX idx_animal_departures_animal_number ON public.animal_departures(animal_number);
CREATE INDEX idx_animal_departures_departure_date ON public.animal_departures(departure_date);
CREATE INDEX idx_animal_departures_has_conflict ON public.animal_departures(has_withdrawal_conflict);

-- Add comment
COMMENT ON TABLE public.animal_departures IS 'Tracks animals that have been sent away (išvežti gyvūnai) and checks for withdrawal period conflicts';

-- Function to upsert departed animals from N8N
-- This handles the weekly Excel import without creating duplicates
CREATE OR REPLACE FUNCTION upsert_animal_departure(
  p_animal_number TEXT,
  p_departure_date DATE,
  p_gender TEXT DEFAULT NULL,
  p_birth_date TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_vet_reason_code TEXT DEFAULT NULL,
  p_destination_name TEXT DEFAULT NULL,
  p_destination_herd_number TEXT DEFAULT NULL,
  p_source_name TEXT DEFAULT NULL,
  p_source_herd_number TEXT DEFAULT NULL,
  p_entered_by TEXT DEFAULT NULL
)
RETURNS TABLE (
  departure_id UUID,
  animal_found BOOLEAN,
  has_conflict BOOLEAN,
  conflict_message TEXT
) AS $$
DECLARE
  v_animal_id UUID;
  v_departure_id UUID;
  v_last_treatment_date DATE;
  v_last_withdrawal_milk DATE;
  v_last_withdrawal_meat DATE;
  v_has_conflict BOOLEAN := false;
  v_conflict_details TEXT := '';
BEGIN
  -- Find the animal by tag number
  SELECT id INTO v_animal_id
  FROM public.animals
  WHERE tag_no = p_animal_number
  LIMIT 1;
  
  -- Get the latest withdrawal dates for this animal
  IF v_animal_id IS NOT NULL THEN
    -- Get last treatment date and max withdrawal dates
    SELECT 
      MAX(t.reg_date),
      MAX(t.withdrawal_until_milk),
      MAX(t.withdrawal_until_meat)
    INTO 
      v_last_treatment_date,
      v_last_withdrawal_milk,
      v_last_withdrawal_meat
    FROM public.treatments t
    WHERE t.animal_id = v_animal_id;
    
    -- Check for conflicts
    IF v_last_withdrawal_milk IS NOT NULL AND p_departure_date < v_last_withdrawal_milk THEN
      v_has_conflict := true;
      v_conflict_details := v_conflict_details || 
        'PIENO KARENCIJA: Išvežta ' || p_departure_date || 
        ', bet pieno karencija baigiasi ' || v_last_withdrawal_milk || 
        ' (dar ' || (v_last_withdrawal_milk - p_departure_date) || ' d.). ';
    END IF;
    
    IF v_last_withdrawal_meat IS NOT NULL AND p_departure_date < v_last_withdrawal_meat THEN
      v_has_conflict := true;
      v_conflict_details := v_conflict_details || 
        'MĖSOS KARENCIJA: Išvežta ' || p_departure_date || 
        ', bet mėsos karencija baigiasi ' || v_last_withdrawal_meat || 
        ' (dar ' || (v_last_withdrawal_meat - p_departure_date) || ' d.). ';
    END IF;
    
    IF NOT v_has_conflict THEN
      v_conflict_details := 'Nėra karencijos konfliktų';
    END IF;
  ELSE
    -- Animal not found in database
    v_conflict_details := 'Gyvūnas nerastas duomenų bazėje (galbūt dar nesinchronizuotas iš VIC)';
  END IF;
  
  -- Upsert the departure record
  INSERT INTO public.animal_departures (
    animal_id,
    animal_number,
    departure_date,
    gender,
    birth_date,
    reason,
    vet_reason_code,
    destination_name,
    destination_herd_number,
    source_name,
    source_herd_number,
    entered_by,
    last_treatment_date,
    last_withdrawal_milk,
    last_withdrawal_meat,
    has_withdrawal_conflict,
    conflict_details,
    updated_at
  ) VALUES (
    v_animal_id,
    p_animal_number,
    p_departure_date,
    p_gender,
    p_birth_date,
    p_reason,
    p_vet_reason_code,
    p_destination_name,
    p_destination_herd_number,
    p_source_name,
    p_source_herd_number,
    p_entered_by,
    v_last_treatment_date,
    v_last_withdrawal_milk,
    v_last_withdrawal_meat,
    v_has_conflict,
    v_conflict_details,
    NOW()
  )
  ON CONFLICT (animal_number, departure_date) 
  DO UPDATE SET
    animal_id = EXCLUDED.animal_id,
    gender = EXCLUDED.gender,
    birth_date = EXCLUDED.birth_date,
    reason = EXCLUDED.reason,
    vet_reason_code = EXCLUDED.vet_reason_code,
    destination_name = EXCLUDED.destination_name,
    destination_herd_number = EXCLUDED.destination_herd_number,
    source_name = EXCLUDED.source_name,
    source_herd_number = EXCLUDED.source_herd_number,
    entered_by = EXCLUDED.entered_by,
    last_treatment_date = EXCLUDED.last_treatment_date,
    last_withdrawal_milk = EXCLUDED.last_withdrawal_milk,
    last_withdrawal_meat = EXCLUDED.last_withdrawal_meat,
    has_withdrawal_conflict = EXCLUDED.has_withdrawal_conflict,
    conflict_details = EXCLUDED.conflict_details,
    updated_at = NOW()
  RETURNING id INTO v_departure_id;
  
  -- Return the result
  RETURN QUERY SELECT 
    v_departure_id,
    (v_animal_id IS NOT NULL),
    v_has_conflict,
    v_conflict_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_animal_departure TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_animal_departure TO anon;

COMMENT ON FUNCTION upsert_animal_departure IS 'Upserts animal departure record from N8N Excel import. Checks for withdrawal period conflicts. Prevents duplicates using (animal_number, departure_date) unique constraint.';

-- View for easy querying of departed animals with conflicts
CREATE OR REPLACE VIEW vw_animal_departures_with_conflicts AS
SELECT 
  ad.id,
  ad.animal_number,
  ad.departure_date,
  ad.gender,
  ad.birth_date,
  ad.reason,
  ad.vet_reason_code,
  ad.destination_name,
  ad.destination_herd_number,
  ad.source_name,
  ad.source_herd_number,
  ad.entered_by,
  ad.last_treatment_date,
  ad.last_withdrawal_milk,
  ad.last_withdrawal_meat,
  ad.has_withdrawal_conflict,
  ad.conflict_details,
  
  -- Calculate days of conflict
  CASE 
    WHEN ad.last_withdrawal_milk IS NOT NULL AND ad.departure_date < ad.last_withdrawal_milk 
    THEN (ad.last_withdrawal_milk - ad.departure_date)
    ELSE 0
  END AS milk_conflict_days,
  
  CASE 
    WHEN ad.last_withdrawal_meat IS NOT NULL AND ad.departure_date < ad.last_withdrawal_meat 
    THEN (ad.last_withdrawal_meat - ad.departure_date)
    ELSE 0
  END AS meat_conflict_days,
  
  -- Get animal info if found
  a.id AS animal_id,
  a.tag_no,
  a.species,
  a.sex,
  a.breed,
  a.active AS animal_active,
  
  ad.created_at,
  ad.updated_at
FROM public.animal_departures ad
LEFT JOIN public.animals a ON ad.animal_id = a.id
ORDER BY ad.departure_date DESC, ad.has_withdrawal_conflict DESC;

COMMENT ON VIEW vw_animal_departures_with_conflicts IS 'View of departed animals showing withdrawal period conflicts and details';

-- RLS Policies (allow authenticated users to read)
ALTER TABLE public.animal_departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read animal departures"
  ON public.animal_departures
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon to insert animal departures (for N8N)"
  ON public.animal_departures
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update animal departures (for N8N)"
  ON public.animal_departures
  FOR UPDATE
  TO anon
  USING (true);
