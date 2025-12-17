/*
  # Fix Treated Animals Report - Add Doses from Usage Items

  Updates the vw_treated_animals view to show medication doses from BOTH sources:
  1. usage_items (one-time administrations during visits)
  2. treatment_courses (ongoing owner-administered treatments)

  Previously, the dose_summary column only showed doses from treatment_courses,
  leaving many rows with empty dose information when medications were given
  via usage_items only.
*/

DROP VIEW IF EXISTS vw_treated_animals;

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

    -- Total dose given - NOW FROM BOTH SOURCES
    COALESCE(
        NULLIF(
            TRIM(
                CONCAT(
                    -- Doses from usage_items (one-time administrations)
                    COALESCE(
                        (SELECT STRING_AGG(
                            CONCAT(ui.qty, ' ', p.primary_pack_unit, ' (', p.name, ')'),
                            '; '
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
                    -- Doses from treatment_courses (owner-administered)
                    COALESCE(
                        (SELECT STRING_AGG(
                            CONCAT(tc.total_dose, ' ', tc.unit, ' (', p.name, ')'),
                            '; '
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
