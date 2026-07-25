import React from 'react'
import { cn } from '@/lib/utils'

export interface WeightTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  weightKg?: number | string | null
  unit?: string
  size?: 'sm' | 'md'
  showIcon?: boolean
}

export const WeightTag: React.FC<WeightTagProps> = ({
  weightKg,
  unit = 'kg',
  size = 'sm',
  showIcon = false,
  className,
  ...props
}) => {
  if (weightKg === null || weightKg === undefined || weightKg === '') {
    return null
  }

  const numericWeight = typeof weightKg === 'string' ? parseFloat(weightKg) : weightKg

  let displayString = `${numericWeight} ${unit}`
  if (!isNaN(numericWeight) && unit === 'kg') {
    if (numericWeight < 1 && numericWeight > 0) {
      displayString = `${Math.round(numericWeight * 1000)}g`
    } else {
      displayString = `${numericWeight % 1 === 0 ? numericWeight.toFixed(0) : numericWeight.toFixed(1)}kg`
    }
  }

  return (
    <span
      className={cn(
        'text-[#6B7570] font-normal text-xs font-sans inline-flex items-center gap-1',
        size === 'md' ? 'text-sm' : 'text-xs',
        className
      )}
      {...props}
    >
      {showIcon && (
        <svg className="w-3.5 h-3.5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l9-3 9 3m-18 6l9-3 9 3m-18 6l9-3 9 3" />
        </svg>
      )}
      {displayString}
    </span>
  )
}
