/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState } from 'react'
import { CldImage } from 'next-cloudinary'

export interface CldProductImageProps {
  src?: string | null
  cloudinaryPublicId?: string | null
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  sizes?: string
  priority?: boolean
  onError?: () => void
}

export const CldProductImage: React.FC<CldProductImageProps> = ({
  src,
  cloudinaryPublicId,
  alt,
  width = 600,
  height = 600,
  fill = false,
  className = '',
  sizes,
  priority,
  onError,
}) => {
  const [hasError, setHasError] = useState(false)

  const handleImageError = () => {
    setHasError(true)
    if (onError) onError()
  }

  // Helper to determine if a string is a Cloudinary public_id or Cloudinary URL
  const publicId = cloudinaryPublicId || (src && src.includes('res.cloudinary.com') ? src : null)

  if (hasError || (!src && !cloudinaryPublicId)) {
    return (
      <div className={`flex flex-col items-center justify-center bg-surface-hover text-muted p-4 text-xs font-normal ${className}`}>
        No image
      </div>
    )
  }

  // 1. Render CldImage from next-cloudinary if Cloudinary public_id or Cloudinary URL is provided
  if (publicId) {
    return (
      <CldImage
        src={publicId}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        format="auto"
        quality="auto"
        crop="fill"
        className={className}
        onError={handleImageError}
      />
    )
  }

  // 2. Fallback to standard <img> for legacy Supabase Storage or external URLs
  return (
    <img
      src={src!}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleImageError}
      loading={priority ? 'eager' : 'lazy'}
    />
  )
}
