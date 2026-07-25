import { uploadImageToCloudinary, deleteImageFromCloudinary } from '@/lib/cloudinary/upload'

export const BUCKET_NAME = 'product-images'

/**
 * Uploads a file to Cloudinary and returns publicUrl and public_id.
 * Redirected from legacy Supabase Storage helper to Cloudinary.
 */
export async function uploadProductImage(
  file: File,
  folder: string = 'products'
): Promise<{ publicUrl: string | null; public_id: string | null; error: string | null }> {
  const result = await uploadImageToCloudinary(file, folder)
  return {
    publicUrl: result.url,
    public_id: result.public_id,
    error: result.error,
  }
}

/**
 * Deletes image from Cloudinary if public_id or Cloudinary URL is supplied.
 * Redirected from legacy Supabase Storage helper to Cloudinary.
 */
export async function deleteProductImageByUrl(
  publicUrlOrId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!publicUrlOrId) return { success: true, error: null }
  return deleteImageFromCloudinary(publicUrlOrId)
}
