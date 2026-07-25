import React from 'react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Loading',
  ...props
}) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  }

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn('inline-block animate-spin rounded-full border-[#2F6B3C] border-t-transparent', sizes[size], className)}
      {...props}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )
}
