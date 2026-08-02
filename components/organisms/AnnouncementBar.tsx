'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSettings } from '@/context/SettingsContext'

export const AnnouncementBar: React.FC = () => {
  const { settings } = useSettings()
  const config = settings.announcement_bar

  const [mounted, setMounted] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Avoid hydration mismatch and check sessionStorage for dismissal state
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('announcement_bar_dismissed')
      if (dismissed === 'true') {
        setIsDismissed(true)
      }
    }
  }, [])

  const messages = config?.messages || []
  const hasMultiple = messages.length > 1

  // Handle auto-advance for multiple messages
  useEffect(() => {
    if (!hasMultiple) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, 4000)

    return () => clearInterval(timer)
  }, [hasMultiple, messages.length])

  // Reset index if messages array changes
  useEffect(() => {
    if (currentIndex >= messages.length) {
      setCurrentIndex(0)
    }
  }, [messages.length, currentIndex])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length)
  }, [messages.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % messages.length)
  }, [messages.length])

  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('announcement_bar_dismissed', 'true')
    }
  }, [])

  // Do not render before hydration mounted, if feature inactive, if dismissed, or no valid messages
  if (!mounted || !config?.is_active || isDismissed || messages.length === 0) {
    return null
  }

  const currentMsg = messages[currentIndex] || messages[0]
  if (!currentMsg || !currentMsg.text) return null

  const bgColor = config.background_color || '#2F6B3C'
  const textColor = config.text_color || '#FFFFFF'

  return (
    <aside
      aria-label="Announcement Bar"
      style={{ backgroundColor: bgColor, color: textColor }}
      className="relative w-full min-h-[40px] px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium z-40 transition-colors"
    >
      <div className="mx-auto flex items-center justify-center gap-2 max-w-7xl w-full min-w-0 pr-6 sm:pr-8 pl-6 sm:pl-8">
        {/* Left Arrow (Only if multiple messages) */}
        {hasMultiple && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous announcement"
            className="p-1 hover:opacity-80 transition-opacity focus:outline-hidden shrink-0 cursor-pointer text-current"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Active Announcement Content */}
        <div className="truncate text-center max-w-full">
          {currentMsg.link_url ? (
            <Link
              href={currentMsg.link_url}
              className="hover:underline inline-flex items-center gap-1 font-medium transition-opacity focus:outline-hidden"
            >
              <span>{currentMsg.text}</span>
            </Link>
          ) : (
            <span>{currentMsg.text}</span>
          )}
        </div>

        {/* Right Arrow (Only if multiple messages) */}
        {hasMultiple && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next announcement"
            className="p-1 hover:opacity-80 transition-opacity focus:outline-hidden shrink-0 cursor-pointer text-current"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Dismiss / Close Button */}
      {config.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement bar"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 hover:opacity-80 transition-opacity focus:outline-hidden cursor-pointer text-current rounded-full"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </aside>
  )
}
