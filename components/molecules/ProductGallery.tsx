/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export interface GalleryImage {
  id: string
  url: string
  sort_order?: number | null
}

export interface ProductGalleryProps {
  images?: GalleryImage[]
  productName: string
  className?: string
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images = [],
  productName,
  className,
}) => {
  const sortedImages = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imageError, setImageError] = useState<Record<number, boolean>>({})

  const [prevImages, setPrevImages] = useState(images)
  if (prevImages !== images) {
    setPrevImages(images)
    setSelectedIndex(0)
  }

  const safeIndex = Math.min(selectedIndex, Math.max(0, sortedImages.length - 1))
  const currentImage = sortedImages[safeIndex]

  const handleImageError = (index: number) => {
    setImageError((prev) => ({ ...prev, [index]: true }))
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Main Image View */}
      <div className="relative aspect-square w-full rounded-2xl border border-border bg-[#F4F6F4] overflow-hidden flex items-center justify-center shadow-xs">
        {currentImage && !imageError[selectedIndex] ? (
          <img
            src={currentImage.url}
            alt={`${productName} view ${selectedIndex + 1}`}
            onError={() => handleImageError(selectedIndex)}
            className="h-full w-full object-cover object-center transition-all duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted/40 p-6">
            <svg
              className="h-16 w-16 stroke-[1.2]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium text-muted/50 mt-2">No image available</span>
          </div>
        )}
      </div>

      {/* Thumbnails list */}
      {sortedImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          {sortedImages.map((img, idx) => {
            const isSelected = idx === selectedIndex
            const isFailed = imageError[idx]

            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`Select image ${idx + 1}`}
                className={cn(
                  'relative h-20 w-20 shrink-0 rounded-lg border-2 bg-[#F4F6F4] overflow-hidden transition-all cursor-pointer',
                  isSelected
                    ? 'border-accent ring-2 ring-accent/20'
                    : 'border-border hover:border-muted/50'
                )}
              >
                {!isFailed ? (
                  <img
                    src={img.url}
                    alt=""
                    onError={() => handleImageError(idx)}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                    N/A
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
