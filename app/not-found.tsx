import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/atoms/Button'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: "The page you're looking for doesn't exist or may have moved.",
}

export default function NotFound() {
  return (
    <main className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28 font-sans">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C2521] tracking-tight font-heading">
          Page not found
        </h1>
        <p className="text-sm sm:text-base text-[#6B7570] font-normal leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button variant="primary" size="md" className="w-full sm:w-auto min-h-[44px]">
              Back to homepage
            </Button>
          </Link>
          <Link
            href="/products"
            className="text-sm font-medium text-[#2F6B3C] hover:underline px-3 py-2 transition-colors inline-flex items-center min-h-[44px]"
          >
            Browse all products
          </Link>
        </div>
      </div>
    </main>
  )
}
