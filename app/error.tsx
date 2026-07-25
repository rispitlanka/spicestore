'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console / error tracking service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-white text-[#1C2521] flex flex-col justify-between p-6 sm:p-12 font-sans">
      {/* Minimal Self-Contained Brand Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-[#E7ECE8]">
        <Link href="/" className="text-base sm:text-lg font-semibold tracking-tight text-[#1C2521] uppercase">
          YARL SAMAYAL
        </Link>
      </header>

      {/* Centered Main Error View */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="max-w-md w-full space-y-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight font-heading">
            Something went wrong
          </h1>
          <p className="text-sm sm:text-base text-[#6B7570] font-normal leading-relaxed">
            We hit an unexpected error. Please try again, or head back to the homepage.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => reset()}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Try again
            </Button>
            <Link
              href="/"
              className="text-sm font-medium text-[#2F6B3C] hover:underline px-3 py-2 transition-colors inline-flex items-center min-h-[44px]"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal Self-Contained Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-6 border-t border-[#E7ECE8] text-center text-xs text-[#6B7570]">
        &copy; {new Date().getFullYear()} Yarl Samayal. All rights reserved.
      </footer>
    </div>
  )
}
