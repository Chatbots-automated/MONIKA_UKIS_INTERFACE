/*
  # Fix Treated Animals View - Complete Dose Summary

  ## Problem
  The `vw_treated_animals` view's dose_summary field only shows data from
  treatment_courses, but most treatments use usage_items directly.
  This causes empty dose_summary fields even when medications were used.

  ## Solution
  Update dose_summary to combine data from BOTH:
  - usage_items (direct medication administration)
  - treatment_courses (multi-day treatment courses)

  ## Changes
  - Recreate vw_treated_animals view with corrected dose_summary logic
  - dose_summary now shows: "qty unit (product_name)" for all medications
*/

DROP VIEW IF EXISTS vw_treated_animals CASCADE;

CREATE VIEW vw_treated_animals AS
SELECT
    t.id as treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date as registration_date,
    a.tag_no as animal_tag,
    a.species,
    a.holder_name as owner_name,
    a.holder_address as owner_address,
    d.name as disease_name,
    d.code as disease_code,
    t.clinical_diagnosis,
    t.animal_condition,
    t.first_symptoms_date,

    -- Combine medications from both usage_items and treatment_courses
    COALESCE(
        NULLIF(
            TRIM(
                CONCAT(
                    -- One-time usage items
                    COALESCE(
                        (SELECT STRING_AGG(DISTINCT p.name, ', ')
                         FROM usage_items ui
                         JOIN products p ON ui.product_id = p.id
                         WHERE ui.treatment_id = t.id),
                        ''
                    ),
                    -- Add separator if both exist
                    CASE
                        WHEN EXISTS(SELECT 1 FROM usage_items WHERE treatment_id = t.id)
                             AND EXISTS(SELECT 1 FROM treatment_courses WHERE treatment_id = t.id)
                        THEN ', '
                        ELSE ''
                    END,
                    -- Treatment courses
                    COALESCE(
                        (SELECT STRING_AGG(DISTINCT p.name, ', ')
                         FROM treatment_courses tc
                         JOIN products p ON tc.product_id = p.id
                         WHERE tc.treatment_id = t.id),
                        ''
                    )
                )
            ),
            ''
        ),
        NULL
    ) as products_used,

    -- FIXED: Dose summary from BOTH usage_items AND treatment_courses
    COALESCE(
        NULLIF(
            TRIM(
                CONCAT(
                    -- Usage items doses
                    COALESCE(
                        (SELECT STRING_AGG(
                            CONCAT(ui.qty, ' ', ui.unit, ' (', p.name, ')'),
                            '; '
                            ORDER BY p.name
                        )
                         FROM usage_items ui
                         JOIN products p ON ui.product_id = p.id
                         WHERE ui.treatment_id = t.id),
                        ''
                    ),
                    -- Add separator if both exist
                    CASE
                        WHEN EXISTS(SELECT 1 FROM usage_items WHERE treatment_id = t.id)
                             AND EXISTS(SELECT 1 FROM treatment_courses WHERE treatment_id = t.id)
                        THEN '; '
                        ELSE ''
                    END,
                    -- Treatment course doses
                    COALESCE(
                        (SELECT STRING_AGG(
                            CONCAT(tc.total_dose, ' ', tc.unit, ' (', p.name, ')'),
                            '; '
                            ORDER BY p.name
                        )
                         FROM treatment_courses tc
                         JOIN products p ON tc.product_id = p.id
                         WHERE tc.treatment_id = t.id),
                        ''
                    )
                )
            ),
            ''
        ),
        NULL
    ) as dose_summary,

    -- Treatment duration (from treatment courses)
    (SELECT MAX(tc.days)
     FROM treatment_courses tc
     WHERE tc.treatment_id = t.id
    ) as treatment_days,

    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome as treatment_outcome,
    t.vet_name as veterinarian,
    t.notes
FROM treatments t
LEFT JOIN animals a ON t.animal_id = a.id
LEFT JOIN diseases d ON t.disease_id = d.id
ORDER BY t.reg_date DESC;

-- Add helpful comment
COMMENT ON VIEW vw_treated_animals IS 'Comprehensive view of all animal treatments with medications from both usage_items and treatment_courses. Used for the Treated Animals Register report (Gydomų gyvūnų registras).';
