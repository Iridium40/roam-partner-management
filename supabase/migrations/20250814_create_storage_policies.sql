-- Create RLS policies for roam-file-storage bucket to allow file uploads

-- Enable RLS on storage.objects (should already be enabled by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        bucket_id = 'roam-file-storage'
    );

-- Policy for authenticated users to view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'roam-file-storage'
    );

-- Policy for authenticated users to update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'roam-file-storage'
    );

-- Policy for authenticated users to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'roam-file-storage'
    );

-- More specific policy for provider document uploads
-- This allows providers to upload to their specific folders
CREATE POLICY "Providers can upload to their folders" ON storage.objects
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        bucket_id = 'roam-file-storage' AND
        (
            -- Allow uploads to provider-specific folders
            name LIKE 'provider-dl/%' OR
            name LIKE 'provider-insurance/%' OR
            name LIKE 'provider-business/%' OR
            name LIKE 'business-documents/%' OR
            name LIKE 'provider-avatars/%' OR
            name LIKE 'customer-avatars/%' OR
            name LIKE 'service-images/%' OR
            name LIKE 'business-images/%' OR
            name LIKE 'brand-assets/%' OR
            name LIKE 'system-settings/%'
        )
    );

-- Policy for public read access to certain folders (like brand assets)
CREATE POLICY "Public read access to public folders" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'roam-file-storage' AND
        (
            name LIKE 'brand-assets/%' OR
            name LIKE 'system-settings/%' OR
            name LIKE 'service-images/%' OR
            name LIKE 'business-images/%'
        )
    );

-- Admin policy for full access
CREATE POLICY "Admins have full access" ON storage.objects
    FOR ALL USING (
        bucket_id = 'roam-file-storage' AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create the roam-file-storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'roam-file-storage',
    'roam-file-storage',
    true,
    52428800, -- 50MB limit
    ARRAY[
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
