import React from 'react'
import { Spinner } from '@/components/atoms/Spinner'

export default function LoadingProduct() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <Spinner size="lg" />
      <p className="mt-4 text-sm font-medium text-muted">Loading product details...</p>
    </div>
  )
}
