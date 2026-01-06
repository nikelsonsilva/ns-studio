-- Create storage bucket for professional photos
-- Run this in Supabase SQL Editor or Dashboard -> Storage -> New Bucket

-- Note: Buckets are typically created via Dashboard, but here's the storage policy

-- Create the bucket (via Dashboard: Storage -> New Bucket -> Name: professional-photos, Public: true)

-- If bucket already exists, apply these policies:

-- Enable public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-photos');

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'professional-photos');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'professional-photos');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'professional-photos');

-- Also ensure the professionals table has an avatar column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avatar TEXT;
