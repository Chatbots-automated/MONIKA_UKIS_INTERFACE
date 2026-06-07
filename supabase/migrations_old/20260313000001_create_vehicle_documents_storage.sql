-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-documents', 'vehicle-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle documents" ON storage.objects;

-- Set up storage policies for vehicle documents (more permissive)
CREATE POLICY "Public can view vehicle documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Users can upload vehicle documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-documents');

CREATE POLICY "Users can update vehicle documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Users can delete vehicle documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-documents');
