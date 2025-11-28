/*
  # Create Comprehensive Hoof Tracking System

  ## Overview
  This migration creates a professional hoof/nail health tracking system for dairy cattle,
  similar to BoviSync and Hooftec systems. Designed for efficient data entry at trimming
  chutes and powerful analytics for herd health management.

  ## New Tables

  ### 1. hoof_condition_codes
  Reference table for standardized hoof condition codes
  - `code` (text, primary key) - Standard code (DD, SU, WL, etc.)
  - `name_lt` (text) - Lithuanian name
  - `name_en` (text) - English name
  - `description` (text) - Detailed description
  - `typical_severity_range` (text) - Typical severity range (e.g., "1-4")
  - `treatment_notes` (text) - Standard treatment recommendations
  - `is_active` (boolean) - Whether code is currently in use

  ### 2. hoof_records
  Main table for recording hoof examinations and treatments
  - Complete tracking of leg, claw, condition, severity
  - Links to animals, visits, products, and batches
  - Treatment tracking and follow-up management

  ## Views

  ### hoof_analytics_summary - Per-animal hoof health statistics
  ### hoof_condition_trends - Monthly trends across herd
  ### hoof_followup_needed - Animals requiring follow-up
  ### hoof_recurring_problems - Recurring hoof issues identification

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read/create
  - Users can update their own records, admins/vets can update any
  - Only admins can delete
*/

-- Create hoof condition codes reference table
CREATE TABLE IF NOT EXISTS hoof_condition_codes (
  code text PRIMARY KEY,
  name_lt text NOT NULL,
  name_en text NOT NULL,
  description text,
  typical_severity_range text,
  treatment_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert standard hoof condition codes
INSERT INTO hoof_condition_codes (code, name_lt, name_en, description, typical_severity_range, treatment_notes) VALUES
  ('DD', 'Mortellaro (Skaitmeninė dermatitas)', 'Digital Dermatitis', 'Infekcinė liga, sukelianti pažeidimus aplink nagų pagrindą. Dažnai laikoma Mortellaro liga.', '0-4', 'Stadijos M0-M4. Gydymas: antibiotiniai purškikliai, tvarstis. Prevencija: pėdų vonios.'),
  ('SU', 'Pado opa', 'Sole Ulcer', 'Opa pado srityje, dažnai dėl per didelio spaudimo ant išorinio pirkšto.', '1-3', 'Kirpimas, spaudimo mažinimas, blokavimas, lokalus antiseptikas.'),
  ('WL', 'Baltosios linijos liga', 'White Line Disease', 'Atsiskyrimas tarp rago sienos ir pado, leidžiantis patekti nuodingoms medžiagoms.', '1-3', 'Valymas, atskirimas pažeisto rago, antiseptikas, tvarstis.'),
  ('HH', 'Kulno pūlinys', 'Heel Horn Erosion', 'Kulno srities erozija, dažnai dėl drėgmės ir netinkamos higienos.', '1-3', 'Kirpimas, dezinfekcija, pėdų vonios, higienos gerinimas.'),
  ('IH', 'Tarppirščio hiperplazija', 'Interdigital Hyperplasia', 'Audinių augimas tarp pirštų, trukdantis normaliai judėti.', '1-3', 'Chirurginis pašalinimas, antibiotikai, tvarstis.'),
  ('FW', 'Flegimonas (pūlingas uždegimas)', 'Foul in the Foot', 'Ūmi bakterinė infekcija, sukelia stiprų pažeidimą ir šlubumo.', '2-4', 'Sisteminis antibiotinis gydymas, lokalus gydymas, ramybė.'),
  ('TU', 'Piršto opa', 'Toe Ulcer', 'Opa priekinėje pado dalyje, dažnai ant vidinės letenos.', '1-3', 'Kirpimas, antiseptikas, blokavimas jei sunkus.'),
  ('ID', 'Tarppirščio dermatitas', 'Interdigital Dermatitis', 'Uždegimas tarp pirštų, dažnai dėl drėgmės ir purvo.', '1-2', 'Valymas, antiseptinis purškiklis, pėdų vonios.'),
  ('SP', 'Pado prasiveržimas', 'Sole Penetration', 'Svetimkūnio įsiskverbimas per padą, sukelia infekciją.', '2-4', 'Svetimkūnio pašalinimas, antiseptikas, antibiotikai, tvarstis.'),
  ('HC', 'Kulno įtrūkimas', 'Heel Crack', 'Vertikalus įtrūkimas kulno srityje.', '1-3', 'Kirpimas, antiseptikas, bandymas mažinti spaudimą.'),
  ('CR', 'Vijinis nagas', 'Corkscrew Claw', 'Nenormalus nago užsisukimas į spiralę.', '2-3', 'Reguliarus kirpimas, koregavimas.'),
  ('SC', 'Žirklinis nagas', 'Scissor Claw', 'Vienas nagas peraugęs kitą, sukuria žirklių formą.', '2-3', 'Reguliarus kirpimas, koregavimas.'),
  ('HL', 'Šlubuliavimas', 'Lameness', 'Bendras šlubuliavimas be konkrečios matomos priežasties.', '1-4', 'Išsamus patikrinimas, nustatyti priežastį.'),
  ('OK', 'Sveika būklė', 'Healthy Condition', 'Nagų būklė gera, profilaktinis kirpimas.', '0', 'Reguliarus profilaktinis kirpimas.')
ON CONFLICT (code) DO NOTHING;

-- Create main hoof records table
CREATE TABLE IF NOT EXISTS hoof_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES animal_visits(id) ON DELETE SET NULL,
  examination_date date NOT NULL DEFAULT CURRENT_DATE,
  leg text NOT NULL CHECK (leg IN ('FL', 'FR', 'HL', 'HR')),
  claw text NOT NULL CHECK (claw IN ('inner', 'outer')),
  condition_code text REFERENCES hoof_condition_codes(code),
  severity integer CHECK (severity >= 0 AND severity <= 4),
  was_trimmed boolean DEFAULT false,
  was_treated boolean DEFAULT false,
  treatment_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  treatment_batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  treatment_quantity decimal(10,3),
  treatment_unit unit,
  treatment_notes text,
  bandage_applied boolean DEFAULT false,
  requires_followup boolean DEFAULT false,
  followup_date date,
  followup_completed boolean DEFAULT false,
  technician_name text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hoof_records_animal_id ON hoof_records(animal_id);
CREATE INDEX IF NOT EXISTS idx_hoof_records_examination_date ON hoof_records(examination_date DESC);
CREATE INDEX IF NOT EXISTS idx_hoof_records_condition_code ON hoof_records(condition_code);
CREATE INDEX IF NOT EXISTS idx_hoof_records_visit_id ON hoof_records(visit_id);
CREATE INDEX IF NOT EXISTS idx_hoof_records_followup ON hoof_records(followup_date) WHERE requires_followup = true AND followup_completed = false;
CREATE INDEX IF NOT EXISTS idx_hoof_records_leg_claw ON hoof_records(animal_id, leg, claw, examination_date DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hoof_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hoof_records_updated_at ON hoof_records;
CREATE TRIGGER trigger_update_hoof_records_updated_at
  BEFORE UPDATE ON hoof_records
  FOR EACH ROW
  EXECUTE FUNCTION update_hoof_records_updated_at();

-- Create view for hoof analytics per animal
CREATE OR REPLACE VIEW hoof_analytics_summary AS
SELECT
  a.id as animal_id,
  a.tag_no,
  a.species,
  COUNT(DISTINCT hr.id) as total_examinations,
  MAX(hr.examination_date) as last_examination_date,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.condition_code IS NOT NULL AND hr.condition_code != 'OK') as total_conditions_found,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.requires_followup = true AND hr.followup_completed = false) as pending_followups,
  AVG(hr.severity) FILTER (WHERE hr.severity IS NOT NULL) as avg_severity,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.was_trimmed = true) as total_trims,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.was_treated = true) as total_treatments,
  (
    SELECT COUNT(*)
    FROM hoof_records hr2
    WHERE hr2.animal_id = a.id
      AND hr2.condition_code IS NOT NULL
      AND hr2.condition_code != 'OK'
      AND EXISTS (
        SELECT 1 FROM hoof_records hr3
        WHERE hr3.animal_id = hr2.animal_id
          AND hr3.leg = hr2.leg
          AND hr3.claw = hr2.claw
          AND hr3.condition_code = hr2.condition_code
          AND hr3.examination_date < hr2.examination_date
          AND hr3.examination_date >= hr2.examination_date - INTERVAL '60 days'
          AND hr3.id != hr2.id
      )
  ) as recurring_conditions_count,
  (
    SELECT hr4.condition_code
    FROM hoof_records hr4
    WHERE hr4.animal_id = a.id
      AND hr4.condition_code IS NOT NULL
      AND hr4.condition_code != 'OK'
    GROUP BY hr4.condition_code
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) as most_common_condition,
  EXTRACT(DAY FROM CURRENT_DATE - MAX(hr.examination_date) FILTER (WHERE hr.was_trimmed = true))::integer as days_since_last_trim
FROM animals a
LEFT JOIN hoof_records hr ON hr.animal_id = a.id
GROUP BY a.id, a.tag_no, a.species;

-- Create view for hoof condition trends
CREATE OR REPLACE VIEW hoof_condition_trends AS
SELECT
  DATE_TRUNC('month', hr.examination_date) as month,
  hr.condition_code,
  hcc.name_lt as condition_name,
  COUNT(*) as occurrence_count,
  AVG(hr.severity) as avg_severity,
  COUNT(DISTINCT hr.animal_id) as affected_animals_count,
  COUNT(*) FILTER (WHERE hr.was_treated = true) as treated_count,
  COUNT(*) FILTER (WHERE hr.severity >= 3) as severe_count
FROM hoof_records hr
LEFT JOIN hoof_condition_codes hcc ON hcc.code = hr.condition_code
WHERE hr.condition_code IS NOT NULL
  AND hr.condition_code != 'OK'
  AND hr.examination_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', hr.examination_date), hr.condition_code, hcc.name_lt
ORDER BY month DESC, occurrence_count DESC;

-- Create view for cows needing follow-up
CREATE OR REPLACE VIEW hoof_followup_needed AS
SELECT
  hr.id as hoof_record_id,
  hr.animal_id,
  a.tag_no,
  a.collar_no,
  hr.examination_date,
  hr.followup_date,
  hr.leg,
  hr.claw,
  hr.condition_code,
  hcc.name_lt as condition_name,
  hr.severity,
  hr.technician_name,
  hr.notes,
  EXTRACT(DAY FROM hr.followup_date - CURRENT_DATE)::integer as days_until_followup
FROM hoof_records hr
JOIN animals a ON a.id = hr.animal_id
LEFT JOIN hoof_condition_codes hcc ON hcc.code = hr.condition_code
WHERE hr.requires_followup = true
  AND hr.followup_completed = false
  AND hr.followup_date IS NOT NULL
ORDER BY hr.followup_date ASC;

-- Create view for recurring hoof problems
CREATE OR REPLACE VIEW hoof_recurring_problems AS
SELECT
  hr1.animal_id,
  a.tag_no,
  a.collar_no,
  hr1.leg,
  hr1.claw,
  hr1.condition_code,
  hcc.name_lt as condition_name,
  hr1.examination_date as latest_examination,
  hr2.examination_date as previous_examination,
  EXTRACT(DAY FROM hr1.examination_date - hr2.examination_date)::integer as days_between,
  COUNT(*) OVER (PARTITION BY hr1.animal_id, hr1.leg, hr1.claw, hr1.condition_code) as recurrence_count
FROM hoof_records hr1
JOIN hoof_records hr2 ON
  hr2.animal_id = hr1.animal_id
  AND hr2.leg = hr1.leg
  AND hr2.claw = hr1.claw
  AND hr2.condition_code = hr1.condition_code
  AND hr2.examination_date < hr1.examination_date
  AND hr2.examination_date >= hr1.examination_date - INTERVAL '60 days'
JOIN animals a ON a.id = hr1.animal_id
LEFT JOIN hoof_condition_codes hcc ON hcc.code = hr1.condition_code
WHERE hr1.condition_code IS NOT NULL
  AND hr1.condition_code != 'OK'
ORDER BY hr1.examination_date DESC, recurrence_count DESC;

-- Enable Row Level Security
ALTER TABLE hoof_condition_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hoof_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hoof_condition_codes
DROP POLICY IF EXISTS "Anyone can view condition codes" ON hoof_condition_codes;
CREATE POLICY "Anyone can view condition codes"
  ON hoof_condition_codes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage condition codes" ON hoof_condition_codes;
CREATE POLICY "Admins can manage condition codes"
  ON hoof_condition_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role = 'admin'
    )
  );

-- RLS Policies for hoof_records
DROP POLICY IF EXISTS "Users can view hoof records" ON hoof_records;
CREATE POLICY "Users can view hoof records"
  ON hoof_records FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create hoof records" ON hoof_records;
CREATE POLICY "Users can create hoof records"
  ON hoof_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own hoof records" ON hoof_records;
CREATE POLICY "Users can update their own hoof records"
  ON hoof_records FOR UPDATE
  TO authenticated
  USING (
    technician_name = current_user
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role IN ('admin', 'veterinarian')
    )
  );

DROP POLICY IF EXISTS "Admins can delete hoof records" ON hoof_records;
CREATE POLICY "Admins can delete hoof records"
  ON hoof_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON TABLE hoof_condition_codes IS 'Reference table for standardized hoof condition codes used internationally';
COMMENT ON TABLE hoof_records IS 'Main table tracking all hoof examinations, conditions, and treatments per animal';
COMMENT ON VIEW hoof_analytics_summary IS 'Per-animal summary of hoof health including examination counts, conditions, and follow-up status';
COMMENT ON VIEW hoof_condition_trends IS 'Monthly trends of hoof conditions across the herd for the past 12 months';
COMMENT ON VIEW hoof_followup_needed IS 'List of animals requiring follow-up examinations with days until due';
COMMENT ON VIEW hoof_recurring_problems IS 'Identifies recurring hoof problems on the same claw within 60-day periods';
