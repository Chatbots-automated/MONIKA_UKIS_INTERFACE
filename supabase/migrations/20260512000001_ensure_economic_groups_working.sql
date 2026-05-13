-- Ensure economic groups system is working properly
-- Run this if the economic group dropdown selection doesn't work

-- First, make sure the column exists
ALTER TABLE public.animal_departures 
ADD COLUMN IF NOT EXISTS economic_group_id UUID REFERENCES public.economic_groups(id) ON DELETE SET NULL;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_animal_departures_economic_group ON public.animal_departures(economic_group_id);

-- Recreate the view to include economic group fields
DROP VIEW IF EXISTS vw_animal_departures_with_conflicts;

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
  
  -- Economic group
  ad.economic_group_id,
  eg.name AS economic_group_name,
  eg.color AS economic_group_color,
  
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
LEFT JOIN public.economic_groups eg ON ad.economic_group_id = eg.id
ORDER BY ad.departure_date DESC, ad.has_withdrawal_conflict DESC;

COMMENT ON VIEW vw_animal_departures_with_conflicts IS 'View of departed animals showing withdrawal period conflicts, economic groups, and details';

-- Ensure RLS policies allow updates
DROP POLICY IF EXISTS "Allow all for animal_departures" ON public.animal_departures;
DROP POLICY IF EXISTS "Allow all for animal_departures anon" ON public.animal_departures;

CREATE POLICY "Allow all for animal_departures"
  ON public.animal_departures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for animal_departures anon"
  ON public.animal_departures
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Ensure economic_groups policies exist
DROP POLICY IF EXISTS "Allow all for economic_groups" ON public.economic_groups;
DROP POLICY IF EXISTS "Allow all for economic_groups anon" ON public.economic_groups;

CREATE POLICY "Allow all for economic_groups"
  ON public.economic_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for economic_groups anon"
  ON public.economic_groups
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
