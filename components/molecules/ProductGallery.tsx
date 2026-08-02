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
    <div className={cn('flex flex-col md:flex-row items-stretch gap-3 md:gap-4 w-full relative', className)}>
      {/* Thumbnails list (Positioned LEFT on desktop md:, below main image on mobile <md) */}
      {sortedImages.length > 1 && (
        <div className="order-2 md:order-1 relative w-full md:w-20 shrink-0">
          <div className="flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto md:absolute md:inset-0 scrollbar-none py-0.5 px-0.5">
            {sortedImages.map((img, idx) => {
              const isSelected = idx === safeIndex
              const isFailed = imageError[idx]

              return (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  aria-label={`Select image ${idx + 1}`}
                  className={cn(
                    'relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 shrink-0 rounded-sm border overflow-hidden transition-all cursor-pointer',
                    isSelected
                      ? 'border-[#2F6B3C] ring-1 ring-[#2F6B3C]/30 opacity-100'
                      : 'border-[#E7ECE8] hover:border-[#6B7570] opacity-70 hover:opacity-100'
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
        </div>
      )}

      {/* Main Image View */}
      <div className="order-1 md:order-2 relative aspect-square flex-1 w-full rounded-sm border border-[#E7ECE8] bg-white overflow-hidden flex items-center justify-center">
        {sortedImages.length > 0 ? (
          sortedImages.map((img, idx) => {
            const isSelected = idx === safeIndex
            const isFailed = imageError[idx]
            if (isFailed) return null

            return (
              <img
                key={img.id || img.url || idx}
                src={img.url}
                alt={`${productName} view ${idx + 1}`}
                onError={() => handleImageError(idx)}
                className={cn(
                  'absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ease-in-out',
                  isSelected ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                )}
              />
            )
          })
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
    </div>
  )
}
