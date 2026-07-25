import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/atoms/Button'

export const metadata: Metadata = {
  title: 'Admin Page Not Found',
}

export default function AdminNotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 py-16 font-sans">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#1C2521] tracking-tight font-heading">
          Admin page not found
        </h1>
        <p className="text-sm text-[#6B7570] font-normal leading-relaxed">
          The requested admin page doesn&apos;t exist or may have moved.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/admin">
            <Button variant="primary" size="md" className="w-full sm:w-auto min-h-[44px]">
              Back to dashboard
            </Button>
          </Link>
          <Link
            href="/"
            target="_blank"
            className="text-sm font-medium text-[#2F6B3C] hover:underline px-3 py-2 transition-colors inline-flex items-center min-h-[44px]"
          >
            View public store
          </Link>
        </div>
      </div>
    </div>
  )
}
