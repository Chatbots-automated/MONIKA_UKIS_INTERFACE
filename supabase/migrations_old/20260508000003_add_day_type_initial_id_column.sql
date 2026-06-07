-- Add day_type_initial_id column to manual_time_entries if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manual_time_entries' 
    AND column_name = 'day_type_initial_id'
  ) THEN
    ALTER TABLE manual_time_entries 
      ADD COLUMN day_type_initial_id UUID REFERENCES day_type_initials(id);
    
    CREATE INDEX manual_time_entries_day_type_initial_id_idx 
      ON manual_time_entries(day_type_initial_id);
  END IF;
END $$;
