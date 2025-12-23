-- Create storage bucket for user profile assets
-- Each user will have their own folder within this bucket

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-profile-assets',
  'user-profile-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own profile assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-profile-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to read their own profile assets
CREATE POLICY "Users can read their own profile assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-profile-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to update their own profile assets
CREATE POLICY "Users can update their own profile assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-profile-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-profile-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to delete their own profile assets
CREATE POLICY "Users can delete their own profile assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-profile-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow public read access (for displaying images)
CREATE POLICY "Public can read profile assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-profile-assets');


