import { supabase } from './supabase';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Upload a file to the user's profile assets bucket
 * Files are stored in: user-profile-assets/{userId}/{filename}
 */
export async function uploadProfileAsset(
  file: File,
  userId: string,
  folder: string = 'headshots'
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: null,
        error: 'Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF).'
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        url: null,
        error: 'File size exceeds 5MB limit. Please upload a smaller image.'
      };
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('user-profile-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        url: null,
        error: error.message || 'Failed to upload file'
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-profile-assets')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      error: null
    };
  } catch (error: any) {
    console.error('Upload exception:', error);
    return {
      url: null,
      error: error.message || 'An unexpected error occurred during upload'
    };
  }
}

/**
 * Delete a file from the user's profile assets bucket
 */
export async function deleteProfileAsset(fileUrl: string, userId: string): Promise<{ error: string | null }> {
  try {
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === 'user-profile-assets');
    
    if (bucketIndex === -1) {
      return { error: 'Invalid file URL' };
    }

    // Reconstruct the file path (everything after the bucket name)
    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    // Verify the file belongs to this user
    if (!filePath.startsWith(userId + '/')) {
      return { error: 'Unauthorized: File does not belong to this user' };
    }

    const { error } = await supabase.storage
      .from('user-profile-assets')
      .remove([filePath]);

    if (error) {
      return { error: error.message || 'Failed to delete file' };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred during deletion' };
  }
}

