# URGENT: Apply Database Migration

## You're getting the 404 error because the database tables don't exist yet!

### Steps to Fix:

1. **Go to your Supabase Dashboard**
   - Visit: https://olxnahsxvyiadknybagt.supabase.co (or your project URL)
   - Log in

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the SQL below and paste it into the editor**

4. **Click "Run" to execute**

---

## SQL TO COPY AND RUN:

```sql
-- Add economic groups for animal departures
-- This allows categorizing exported animals by economic groups (e.g., "Pelningos karvės", "Ūkio turtai", etc.)

-- Create economic_groups table
CREATE TABLE IF NOT EXISTS public.economic_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.economic_groups IS 'Economic groups for categorizing exported animals (išvežti gyvūnai)';

-- Add economic_group_id to animal_departures
ALTER TABLE public.animal_departures 
ADD COLUMN IF NOT EXISTS economic_group_id UUID REFERENCES public.economic_groups(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_animal_departures_economic_group ON public.animal_departures(economic_group_id);

-- Insert some default economic groups
INSERT INTO public.economic_groups (name, description, color) VALUES
  ('Pelningos karvės', 'Karvės, duodančios daug pieno ir pelningos ūkiui', '#10B981'),
  ('Ūkio turtai', 'Gyvūnai, laikomi kaip ūkio turtas', '#3B82F6'),
  ('Mėsinės karvės', 'Karvės, auginamos mėsai', '#EF4444'),
  ('Veršeliai', 'Jaunikliai', '#F59E0B'),
  ('Skerdimui', 'Gyvūnai, parduoti skerdimui', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Update the view to include economic group
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
  ad.economic_group_id,
  eg.name AS economic_group_name,
  eg.color AS economic_group_color,
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

-- RLS Policies for economic_groups
ALTER TABLE public.economic_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read economic groups"
  ON public.economic_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert economic groups"
  ON public.economic_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update economic groups"
  ON public.economic_groups
  FOR UPDATE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.economic_groups TO authenticated;
GRANT SELECT ON public.economic_groups TO anon;
```

---

## After Running the SQL:

1. Refresh your browser page
2. Go to **Veterinarija → Ataskaitos → Išvežti Gyvūnai**
3. You should now see:
   - ✅ Checkboxes to select multiple animals
   - ✅ "Valdyti grupes" button
   - ✅ "Priskirti grupę" button (when animals are selected)
   - ✅ Economic group column

## How to Use the NEW Bulk Assignment Feature:

1. **Select animals** by clicking the checkboxes
2. Click **"Priskirti grupę (X)"** button (shows how many selected)
3. Choose a group from the dropdown
4. Click **"Priskirti grupę"** to apply to all selected animals
5. Done! All selected animals now have that economic group

You can also:
- Click the checkbox in the header to **select all** animals
- Click **"Valdyti grupes"** to create/edit economic groups

---

## That's it! The 404 error will be gone after running the SQL.
