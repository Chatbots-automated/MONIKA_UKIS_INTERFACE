-- Manual script to populate secretary system tables
-- This can be run once to initialize the data, then use n8n for ongoing syncs

-- Note: This is a template. You'll need to generate the actual INSERT statements
-- from the secretary_data.json file using the import_secretary_data.ts script

-- Example structure:

-- INSERT INTO public.secretary_materials (code, name, unit_type, vat_purchase, vat_sale) VALUES
-- (2802, 'Bass nugarinis akumuliatorinis puršktuvas', 'vnt', 21, 21),
-- (1373, 'Kviečiai vasariniai 2015 m.', 'kg', 21, 21),
-- ... (2929 total records)

-- INSERT INTO public.secretary_services (code, name) VALUES
-- (28, 'Tech. apžiūra', NULL),
-- (387, 'Vožtuvas', NULL),
-- ... (1661 total records)

-- INSERT INTO public.secretary_suppliers (code, name, company_code, vat_code, currency) VALUES
-- (3293, 'Hemessen 250 Essen', NULL, NULL, 'Eur'),
-- (3660, 'Mindaugas Klusas', '38606111011', NULL, 'Eur'),
-- ... (2454 total records)

-- INSERT INTO public.secretary_responsible_persons (code, name, additional_info) VALUES
-- (3, 'Vadimas Kovalevskis', 'Komercijos direktorius'),
-- (6, 'Daiva Ramaškevičiūtė', 'Vyr.buhalterė-kasininkė'),
-- (8, 'Oksana Puronaitė', 'Direktorės pavaduotoja'),
-- (11, 'Algirdas Karklis', 'Agronomas'),
-- (12, 'Kristina Puronaitė', 'Direktorė'),
-- (14, 'Ramutis Bartulis', 'Vet. gydytojas'),
-- (16, 'Vitalijus Kuprišnas', 'Vadybininkas'),
-- (18, 'Valantinas Afanasjevas', 'Inžinierius - mechanikas'),
-- (19, 'Indrė Ilonytė', 'Vet. felčeris'),
-- (20, 'Algirdas Ochmanas', 'Agronomas'),
-- (21, 'Artūras Abromaitis', 'Veterinarijos gydytojas');

-- INSERT INTO public.secretary_accounting_operations (code, name, debit, credit, expense_structure) VALUES
-- (95, 'Ilgalaikio turto pasigaminimas', '121', '451', 'Ilgalaikio turto pirkimas'),
-- (27, 'ILGALAIKIS TURTAS', '124', '451', 'Ilgalaikio turto pirkimas'),
-- (2, 'Pašarų Pirkimas', '20001', '451', 'Pašarų pirkimas'),
-- (37, 'Pirkta Sėkla', '20002', '451', 'Pirkta sėkla'),
-- (41, 'Pirktos Trąšos', '20003', '451', 'Trąšos'),
-- (39, 'Augalų Apsaug. Priemonė', '20004', '451', 'Augalų apsaugos priemonės'),
-- (6, 'Medikamentai ir preparatai', '20005', '451', 'Vaistai'),
-- (13, 'Degalai Tepalai', '20006', '451', 'Kuras'),
-- (1, 'Atsarginės Dalys', '20007', '451', 'Atsarginės dalys'),
-- (18, 'Statybinės Medžiagos', '20008', '451', 'Statybinės medžiagos'),
-- (34, 'Kitos žaliavos ir medžiagos', '20009', '451', 'Bendraūkinės');
-- ... (222 total records)

-- To generate the full INSERT statements, run:
-- npx tsx scripts/import_secretary_data.ts
