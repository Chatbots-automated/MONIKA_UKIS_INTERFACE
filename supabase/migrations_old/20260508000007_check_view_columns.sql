-- Check what columns are in the view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_animal_departures_with_conflicts'
ORDER BY ordinal_position;
