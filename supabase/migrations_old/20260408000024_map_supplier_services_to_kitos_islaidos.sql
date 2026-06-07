-- Map "Tiekėjo paslaugos" products to "Kitos išlaidos" category in write-off acts
-- This ensures supplier service invoices appear in the correct category

-- Update the category translation function to map Tiekėjo paslaugos -> Kitos išlaidos
CREATE OR REPLACE FUNCTION translate_category_to_lithuanian(category_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Map specific categories
  CASE category_name
    WHEN 'prevention' THEN RETURN 'Profilaktika';
    WHEN 'treatment' THEN RETURN 'Gydymo priemonės';
    WHEN 'hygiene' THEN RETURN 'Higiena';
    WHEN 'nutrition' THEN RETURN 'Mitybos papildai';
    WHEN 'equipment' THEN RETURN 'Įranga';
    WHEN 'Tiekėjo paslaugos' THEN RETURN 'Kitos išlaidos';  -- Map to Kitos išlaidos
    WHEN 'Supplier Services' THEN RETURN 'Kitos išlaidos';  -- English version too
    ELSE 
      -- Return as-is if already in Lithuanian or unknown
      RETURN COALESCE(category_name, 'Kita');
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION translate_category_to_lithuanian IS 'Translates category names to Lithuanian. Maps "Tiekėjo paslaugos" to "Kitos išlaidos" for write-off acts.';
