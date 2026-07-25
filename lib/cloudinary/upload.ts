export interface CloudinaryUploadResult {
  url: string | null
  public_id: string | null
  error: string | null
}

/**
 * Uploads a file to Cloudinary via server-side API route `/api/cloudinary/upload`.
 */
export async function uploadImageToCloudinary(
  file: File,
  folder: string = 'products'
): Promise<CloudinaryUploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return {
        url: null,
        public_id: null,
        error: data.error || 'Failed to upload image to Cloudinary',
      }
    }

    return {
      url: data.url,
      public_id: data.public_id,
      error: null,
    }
  } catch (err: unknown) {
    console.error('Cloudinary upload exception:', err)
    return {
      url: null,
      public_id: null,
      error: err instanceof Error ? err.message : 'Unknown upload error',
    }
  }
}

/**
 * Deletes an image asset from Cloudinary via server API route `/api/cloudinary/delete`.
 */
export async function deleteImageFromCloudinary(
  publicId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!publicId) return { success: true, error: null }

    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to delete asset from Cloudinary',
      }
    }

    return { success: true, error: null }
  } catch (err: unknown) {
    console.error('Cloudinary delete exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown deletion error',
    }
  }
}
