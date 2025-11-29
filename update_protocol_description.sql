-- Update synchronization protocol descriptions
-- Run this SQL in your Supabase SQL editor if you need to update protocol descriptions

-- Example: Update a specific protocol's description
-- UPDATE synchronization_protocols
-- SET description = 'New description here'
-- WHERE name = 'GGPG' OR name = 'G7G';

-- To view current protocols:
SELECT id, name, description
FROM synchronization_protocols
ORDER BY name;

-- If you want to update all protocols with a specific description:
-- UPDATE synchronization_protocols
-- SET description = 'Išplėstas sinchronizacijos protokolas su 4 vaistų žingsniais'
-- WHERE description = 'Extended synchronization protocol with 4 medication steps';
