-- =====================================================
-- MIGRATION: Storage Policies for client-photos bucket
-- =====================================================
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Policy para INSERT (upload)
CREATE POLICY "Allow authenticated users to upload client photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-photos');

-- 2. Policy para SELECT (visualizar/download)
CREATE POLICY "Allow public read access to client photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-photos');

-- 3. Policy para DELETE (remover fotos)
CREATE POLICY "Allow authenticated users to delete client photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-photos');

-- 4. Policy para UPDATE
CREATE POLICY "Allow authenticated users to update client photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-photos');

-- =====================================================
SELECT '✅ Policies criadas com sucesso!' as status;
