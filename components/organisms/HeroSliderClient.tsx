'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { HeroSlide } from '@/types/database'
import { HeroSliderConfigSetting } from '@/lib/settings'

interface HeroSliderClientProps {
  slides: HeroSlide[]
  config: HeroSliderConfigSetting
}

export function HeroSliderClient({ slides, config }: HeroSliderClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Touch tracking for mobile swipe
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const activeSlides = slides.filter((s) => s.is_active)
  const total = activeSlides.length

  const goToNext = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const goToPrev = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  // Auto-advance slider every 5 seconds if multiple slides and not hovered
  useEffect(() => {
    if (total <= 1 || isPaused) return

    const interval = setInterval(() => {
      goToNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [total, isPaused, goToNext])

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    const threshold = 40

    if (diff > threshold) {
      goToNext()
    } else if (diff < -threshold) {
      goToPrev()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  // 0 active slides: return null so homepage clean intro text remains
  if (total === 0) {
    return null
  }

  const containerStyle = {
    '--h-mobile': `${config?.height_mobile_px || 220}px`,
    '--h-desktop': `${config?.height_desktop_px || 400}px`,
  } as React.CSSProperties

  const renderSlideContent = (slide: HeroSlide) => {
    const imgElement = (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={slide.image_url}
        alt="Homepage banner slide"
        className="w-full h-full object-cover block"
      />
    )

    const linkUrl = slide.link_url?.trim()
    if (!linkUrl) {
      return imgElement
    }

    const isExternal = linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
    if (isExternal) {
      return (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F6B3C]"
        >
          {imgElement}
        </a>
      )
    }

    return (
      <Link
        href={linkUrl}
        className="block w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F6B3C]"
      >
        {imgElement}
      </Link>
    )
  }

  // Single slide view: static image without slider controls
  if (total === 1) {
    const singleSlide = activeSlides[0]
    return (
      <div
        className="w-full relative overflow-hidden rounded-md bg-[#F4F6F4] shadow-xs h-[var(--h-mobile)] sm:h-[var(--h-desktop)]"
        style={containerStyle}
      >
        {renderSlideContent(singleSlide)}
      </div>
    )
  }

  // Multiple slides view: auto-advancing slider with prev/next arrows & dots
  return (
    <div
      className="w-full relative overflow-hidden rounded-md bg-[#F4F6F4] shadow-xs group h-[var(--h-mobile)] sm:h-[var(--h-desktop)] select-none"
      style={containerStyle}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Stack with smooth fade transition */}
      {activeSlides.map((slide, idx) => {
        const isActive = idx === currentIndex
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {renderSlideContent(slide)}
          </div>
        )
      })}

      {/* Prev Arrow Button */}
      <button
        type="button"
        onClick={goToPrev}
        aria-label="Previous Slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-[#1C2521] border border-[#E7ECE8] shadow-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F6B3C]"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next Arrow Button */}
      <button
        type="button"
        onClick={goToNext}
        aria-label="Next Slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-[#1C2521] border border-[#E7ECE8] shadow-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F6B3C]"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Small Dot Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-xs">
        {activeSlides.map((_, idx) => {
          const isActive = idx === currentIndex
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`rounded-full transition-all cursor-pointer focus:outline-none ${
                isActive
                  ? 'w-5 h-2 bg-[#2F6B3C] shadow-xs'
                  : 'w-2 h-2 bg-white/70 hover:bg-white'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
