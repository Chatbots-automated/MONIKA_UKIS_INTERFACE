-- ============================================================================
-- Add "Tiekėjo paslaugos" (Supplier Services) category
-- ============================================================================
-- This category is used for services provided by suppliers that should be
-- automatically written off (nurašymas) when received into stock

INSERT INTO public.equipment_categories (name, description)
VALUES (
  'Tiekėjo paslaugos',
  'Paslaugos teikiamos tiekėjų (automatiškai nurašomos priėmus į sandėlį)'
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE equipment_categories IS 'Product categories including special "Tiekėjo paslaugos" category for automatic write-offs';
