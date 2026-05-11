-- Show all columns in manual_time_entries table
SELECT 
  string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_name = 'manual_time_entries';
