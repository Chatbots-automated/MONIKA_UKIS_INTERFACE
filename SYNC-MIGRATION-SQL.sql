-- ==================================================================
-- SYNCHRONIZATION PROTOCOL SYSTEM - MIGRATION SQL
-- ==================================================================
-- This SQL creates the complete synchronization protocol system
-- for managing breeding protocols (Ovsinhr 56, GGPG, G7G)
--
-- TO APPLY: Copy and paste this entire file into Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new
-- ==================================================================

-- Create synchronization_protocols table
CREATE TABLE IF NOT EXISTS public.synchronization_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  steps jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create animal_synchronizations table
CREATE TABLE IF NOT EXISTS public.animal_synchronizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.synchronization_protocols(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled')),
  insemination_date date,
  insemination_number text,
  result text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create synchronization_steps table
CREATE TABLE IF NOT EXISTS public.synchronization_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synchronization_id uuid NOT NULL REFERENCES public.animal_synchronizations(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  scheduled_date date NOT NULL,
  is_evening boolean DEFAULT false,
  medication_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  dosage decimal(10,2),
  dosage_unit text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  visit_id uuid REFERENCES public.animal_visits(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.synchronization_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_synchronizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synchronization_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read protocols" ON public.synchronization_protocols;
  DROP POLICY IF EXISTS "Users can insert protocols" ON public.synchronization_protocols;
  DROP POLICY IF EXISTS "Users can update protocols" ON public.synchronization_protocols;
  DROP POLICY IF EXISTS "Users can delete protocols" ON public.synchronization_protocols;
  DROP POLICY IF EXISTS "Users can read synchronizations" ON public.animal_synchronizations;
  DROP POLICY IF EXISTS "Users can insert synchronizations" ON public.animal_synchronizations;
  DROP POLICY IF EXISTS "Users can update synchronizations" ON public.animal_synchronizations;
  DROP POLICY IF EXISTS "Users can delete synchronizations" ON public.animal_synchronizations;
  DROP POLICY IF EXISTS "Users can read steps" ON public.synchronization_steps;
  DROP POLICY IF EXISTS "Users can insert steps" ON public.synchronization_steps;
  DROP POLICY IF EXISTS "Users can update steps" ON public.synchronization_steps;
  DROP POLICY IF EXISTS "Users can delete steps" ON public.synchronization_steps;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Policies for synchronization_protocols
CREATE POLICY "Users can read protocols"
  ON public.synchronization_protocols
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert protocols"
  ON public.synchronization_protocols
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update protocols"
  ON public.synchronization_protocols
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete protocols"
  ON public.synchronization_protocols
  FOR DELETE
  USING (true);

-- Policies for animal_synchronizations
CREATE POLICY "Users can read synchronizations"
  ON public.animal_synchronizations
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert synchronizations"
  ON public.animal_synchronizations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update synchronizations"
  ON public.animal_synchronizations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete synchronizations"
  ON public.animal_synchronizations
  FOR DELETE
  USING (true);

-- Policies for synchronization_steps
CREATE POLICY "Users can read steps"
  ON public.synchronization_steps
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert steps"
  ON public.synchronization_steps
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update steps"
  ON public.synchronization_steps
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete steps"
  ON public.synchronization_steps
  FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_animal_id
  ON public.animal_synchronizations(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_status
  ON public.animal_synchronizations(status);
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_start_date
  ON public.animal_synchronizations(start_date);

CREATE INDEX IF NOT EXISTS idx_synchronization_steps_synchronization_id
  ON public.synchronization_steps(synchronization_id);
CREATE INDEX IF NOT EXISTS idx_synchronization_steps_scheduled_date
  ON public.synchronization_steps(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_synchronization_steps_completed
  ON public.synchronization_steps(completed);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_synchronization_protocols ON public.synchronization_protocols;
CREATE TRIGGER set_updated_at_synchronization_protocols
  BEFORE UPDATE ON public.synchronization_protocols
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_animal_synchronizations ON public.animal_synchronizations;
CREATE TRIGGER set_updated_at_animal_synchronizations
  BEFORE UPDATE ON public.animal_synchronizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_synchronization_steps ON public.synchronization_steps;
CREATE TRIGGER set_updated_at_synchronization_steps
  BEFORE UPDATE ON public.synchronization_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default protocol definitions
INSERT INTO public.synchronization_protocols (name, description, steps) VALUES
(
  'Ovsinhr 56',
  'Basic synchronization protocol with 3 medication steps',
  '[
    {"step": 1, "medication": "Ovarelin", "day_offset": 0},
    {"step": 2, "medication": "Enzaprost", "day_offset": 2},
    {"step": 3, "medication": "Ovarelin vakare", "day_offset": 3, "is_evening": true},
    {"step": 4, "medication": "Sėklinti", "day_offset": 4, "is_insemination": true}
  ]'::jsonb
),
(
  'GGPG',
  'Extended synchronization protocol with 4 medication steps',
  '[
    {"step": 1, "medication": "Ovarelin", "day_offset": 0},
    {"step": 2, "medication": "Ovarelin", "day_offset": 7},
    {"step": 3, "medication": "Enzaprost", "day_offset": 14},
    {"step": 4, "medication": "Ovarelin vakare", "day_offset": 16, "is_evening": true},
    {"step": 5, "medication": "Sėklinti", "day_offset": 17, "is_insemination": true}
  ]'::jsonb
),
(
  'G7G',
  'Advanced synchronization protocol with 5 medication steps',
  '[
    {"step": 1, "medication": "Enzaprost", "day_offset": 0},
    {"step": 2, "medication": "Ovarelin", "day_offset": 3},
    {"step": 3, "medication": "Ovarelin", "day_offset": 10},
    {"step": 4, "medication": "Enzaprost", "day_offset": 17},
    {"step": 5, "medication": "Ovarelin Vakare", "day_offset": 19, "is_evening": true},
    {"step": 6, "medication": "Sėklinti", "day_offset": 20, "is_insemination": true}
  ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Function to initialize a new synchronization protocol for an animal
CREATE OR REPLACE FUNCTION public.initialize_animal_synchronization(
  p_animal_id uuid,
  p_protocol_id uuid,
  p_start_date date
)
RETURNS uuid AS $$
DECLARE
  v_sync_id uuid;
  v_protocol_steps jsonb;
  v_step jsonb;
BEGIN
  INSERT INTO public.animal_synchronizations (animal_id, protocol_id, start_date, status)
  VALUES (p_animal_id, p_protocol_id, p_start_date, 'Active')
  RETURNING id INTO v_sync_id;

  SELECT steps INTO v_protocol_steps
  FROM public.synchronization_protocols
  WHERE id = p_protocol_id;

  FOR v_step IN SELECT * FROM jsonb_array_elements(v_protocol_steps)
  LOOP
    INSERT INTO public.synchronization_steps (
      synchronization_id,
      step_number,
      step_name,
      scheduled_date,
      is_evening
    ) VALUES (
      v_sync_id,
      (v_step->>'step')::integer,
      v_step->>'medication',
      p_start_date + (v_step->>'day_offset')::integer,
      COALESCE((v_step->>'is_evening')::boolean, false)
    );
  END LOOP;

  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a synchronization step
CREATE OR REPLACE FUNCTION public.complete_synchronization_step(
  p_step_id uuid,
  p_batch_id uuid DEFAULT NULL,
  p_actual_dosage decimal DEFAULT NULL,
  p_actual_unit text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_step_record record;
BEGIN
  SELECT * INTO v_step_record
  FROM public.synchronization_steps
  WHERE id = p_step_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Step not found';
  END IF;

  IF v_step_record.completed THEN
    RAISE EXCEPTION 'Step already completed';
  END IF;

  UPDATE public.synchronization_steps
  SET
    completed = true,
    completed_at = now(),
    batch_id = p_batch_id,
    dosage = COALESCE(p_actual_dosage, dosage),
    dosage_unit = COALESCE(p_actual_unit, dosage_unit),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_step_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.synchronization_steps
    WHERE synchronization_id = v_step_record.synchronization_id
    AND completed = false
  ) THEN
    UPDATE public.animal_synchronizations
    SET status = 'Completed'
    WHERE id = v_step_record.synchronization_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================================
-- END OF MIGRATION
-- ==================================================================
-- After running this SQL, verify:
-- 1. Three tables created (synchronization_protocols, animal_synchronizations, synchronization_steps)
-- 2. Three protocols inserted (Ovsinhr 56, GGPG, G7G)
-- 3. Two functions created (initialize_animal_synchronization, complete_synchronization_step)
-- ==================================================================
