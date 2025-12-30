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

    -- Combine medications from usage_items, treatment_courses AND visits
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
                    -- Add separator if needed
                    CASE
                        WHEN EXISTS(SELECT 1 FROM usage_items WHERE treatment_id = t.id)
                             AND (EXISTS(SELECT 1 FROM treatment_courses WHERE treatment_id = t.id)
                                  OR EXISTS(SELECT 1 FROM visits v 
                                            JOIN visit_medications vm ON v.id = vm.visit_id
                                            WHERE v.animal_id = t.animal_id 
                                            AND v.visit_date = t.reg_date))
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
                    ),
                    -- Add separator if needed
                    CASE
                        WHEN (EXISTS(SELECT 1 FROM usage_items WHERE treatment_id = t.id)
                              OR EXISTS(SELECT 1 FROM treatment_courses WHERE treatment_id = t.id))
                             AND EXISTS(SELECT 1 FROM visits v 
                                        JOIN visit_medications vm ON v.id = vm.visit_id
                                        WHERE v.animal_id = t.animal_id 
                                        AND v.visit_date = t.reg_date)
                        THEN ', '
                        ELSE ''
                    END,
                    -- Visit medications from the same date
                    COALESCE(
                        (SELECT STRING_AGG(DISTINCT p.name, ', ')
                         FROM visits v
                         JOIN visit_medications vm ON v.id = vm.visit_id
                         JOIN products p ON vm.product_id = p.id
                         WHERE v.animal_id = t.animal_id 
                         AND v.visit_date = t.reg_date),
                        ''
                    )
                )
            ),
            ''
        ),
        NULL
    ) as products_used,

    -- Dose summary from usage_items, treatment_courses AND visits
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
                    -- Separator
                    CASE
                        WHEN EXISTS(SELECT 1 FROM usage_items WHERE treatment_id = t.id)
                             AND (EXISTS(SELECT 1 FROM treatment_courses WHERE treatment_id = t.id)
                                  OR EXISTS(SELECT 1 FROM visits v 
                                            JOIN visit_medications vm ON v.id = vm.visit_id
                                            WHERE v.animal_id = t.animal_id 
                                            AND v.visit_date = t.reg_date))
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
                    ),
                    -- Separator
                    CASE
                        WHEN (EXISTS(SELECT 1 FROM usage_items WHERE treatment_id = t.id)
                              OR EXISTS(SELECT 1 FROM treatment_courses WHERE treatment_id = t.id))
                             AND EXISTS(SELECT 1 FROM visits v 
                                        JOIN visit_medications vm ON v.id = vm.visit_id
                                        WHERE v.animal_id = t.animal_id 
                                        AND v.visit_date = t.reg_date)
                        THEN '; '
                        ELSE ''
                    END,
                    -- Visit medication doses
                    COALESCE(
                        (SELECT STRING_AGG(
                            CONCAT(vm.quantity, ' ', vm.unit, ' (', p.name, ')'),
                            '; '
                            ORDER BY p.name
                        )
                         FROM visits v
                         JOIN visit_medications vm ON v.id = vm.visit_id
                         JOIN products p ON vm.product_id = p.id
                         WHERE v.animal_id = t.animal_id 
                         AND v.visit_date = t.reg_date),
                        ''
                    )
                )
            ),
            ''
        ),
        NULL
    ) as dose_summary,

    -- Treatment duration: from treatment courses OR calculate from visits
    COALESCE(
        (SELECT MAX(tc.days)
         FROM treatment_courses tc
         WHERE tc.treatment_id = t.id),
        (SELECT EXTRACT(DAY FROM MAX(v.visit_date) - MIN(v.visit_date))::integer + 1
         FROM visits v
         JOIN visit_medications vm ON v.id = vm.visit_id
         WHERE v.animal_id = t.animal_id
         AND v.visit_date >= t.reg_date
         AND v.visit_date <= COALESCE(t.reg_date + INTERVAL '30 days', t.reg_date + INTERVAL '30 days')),
        1
    ) as treatment_days,

    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome as treatment_outcome,
    'ARTŪRAS ABROMAITIS' as veterinarian,
    t.notes
FROM treatments t
LEFT JOIN animals a ON t.animal_id = a.id
LEFT JOIN diseases d ON t.disease_id = d.id
ORDER BY t.reg_date DESC;
