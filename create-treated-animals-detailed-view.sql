/*
  # Create Detailed Treated Animals View - One Row Per Medication

  ## Changes
  Creates a new view `vw_treated_animals_detailed` that returns one row per medication used in each treatment.
  This allows the report to show each medication on a separate row when multiple medications were used.

  ## Structure
  - Each row represents one medication used in one treatment
  - All treatment details are repeated for each medication row
  - Sources: usage_items, treatment_courses, and animal_visits.planned_medications

  ## Usage
  Used in the Treated Animals Register (Gydomų gyvūnų registras) report to show each medication separately.
*/

CREATE OR REPLACE VIEW vw_treated_animals_detailed AS
-- Medications from usage_items (one-time usage)
SELECT
    t.id as treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date as registration_date,
    a.tag_no as animal_tag,
    a.species,
    a.holder_name as owner_name,
    a.holder_address as owner_address,

    -- Disease name
    COALESCE(
        d.name,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.animal_condition), '')
    ) as disease_name,

    d.code as disease_code,
    t.clinical_diagnosis,
    t.animal_condition,
    t.first_symptoms_date,

    -- Individual medication details
    p.name as product_name,
    CONCAT(ui.qty, ' ', ui.unit) as dose,
    1 as treatment_days,

    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome as treatment_outcome,
    'ARTŪRAS ABROMAITIS' as veterinarian,
    t.notes,

    'usage_item' as medication_source
FROM treatments t
LEFT JOIN animals a ON t.animal_id = a.id
LEFT JOIN diseases d ON t.disease_id = d.id
INNER JOIN usage_items ui ON ui.treatment_id = t.id
INNER JOIN products p ON ui.product_id = p.id

UNION ALL

-- Medications from treatment_courses (multi-day courses)
SELECT
    t.id as treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date as registration_date,
    a.tag_no as animal_tag,
    a.species,
    a.holder_name as owner_name,
    a.holder_address as owner_address,

    COALESCE(
        d.name,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.animal_condition), '')
    ) as disease_name,

    d.code as disease_code,
    t.clinical_diagnosis,
    t.animal_condition,
    t.first_symptoms_date,

    p.name as product_name,
    CONCAT(tc.total_dose, ' ', tc.unit) as dose,
    tc.days as treatment_days,

    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome as treatment_outcome,
    'ARTŪRAS ABROMAITIS' as veterinarian,
    t.notes,

    'treatment_course' as medication_source
FROM treatments t
LEFT JOIN animals a ON t.animal_id = a.id
LEFT JOIN diseases d ON t.disease_id = d.id
INNER JOIN treatment_courses tc ON tc.treatment_id = t.id
INNER JOIN products p ON tc.product_id = p.id

UNION ALL

-- Medications from animal_visits.planned_medications JSON
SELECT
    t.id as treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date as registration_date,
    a.tag_no as animal_tag,
    a.species,
    a.holder_name as owner_name,
    a.holder_address as owner_address,

    COALESCE(
        d.name,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.animal_condition), '')
    ) as disease_name,

    d.code as disease_code,
    t.clinical_diagnosis,
    t.animal_condition,
    t.first_symptoms_date,

    p.name as product_name,
    CONCAT((med->>'qty')::text, ' ', med->>'unit') as dose,
    1 as treatment_days,

    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome as treatment_outcome,
    'ARTŪRAS ABROMAITIS' as veterinarian,
    t.notes,

    'planned_medication' as medication_source
FROM treatments t
LEFT JOIN animals a ON t.animal_id = a.id
LEFT JOIN diseases d ON t.disease_id = d.id
INNER JOIN animal_visits av ON av.id = t.visit_id
CROSS JOIN jsonb_array_elements(av.planned_medications::jsonb) as med
INNER JOIN products p ON p.id = (med->>'product_id')::uuid
WHERE av.planned_medications IS NOT NULL
  AND jsonb_array_length(av.planned_medications::jsonb) > 0

ORDER BY registration_date DESC;

COMMENT ON VIEW vw_treated_animals_detailed IS 'Detailed view of treated animals with one row per medication. Used for the Treated Animals Register report when each medication needs to be displayed separately.';
