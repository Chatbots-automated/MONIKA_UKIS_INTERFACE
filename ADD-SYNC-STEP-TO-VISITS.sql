/*
  # Add Synchronization Step Link to Visits

  ## Overview
  Links animal visits to synchronization protocol steps for better tracking and automation.

  ## Changes

  1. **Add sync_step_id column to animal_visits**
     - References synchronization_steps table
     - Nullable (not all visits are part of a protocol)
     - Allows tracking which protocol step a visit corresponds to

  2. **Security**
     - No RLS changes needed (inherits from table RLS)

  ## APPLY THIS IN SUPABASE SQL EDITOR
*/

-- Add sync_step_id column to animal_visits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animal_visits' AND column_name = 'sync_step_id'
  ) THEN
    ALTER TABLE public.animal_visits
    ADD COLUMN sync_step_id uuid REFERENCES public.synchronization_steps(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_animal_visits_sync_step ON public.animal_visits(sync_step_id);
  END IF;
END $$;
